-- Refinamento do Marketing Inteligente.
-- Somente estruturas aditivas, validacoes para novas gravacoes e novas RPCs.
-- Produtos, pedidos, campanhas e historicos existentes permanecem intactos.

alter table public.marketing_audit_log
  drop constraint if exists marketing_audit_log_entity_type_check;
alter table public.marketing_audit_log
  add constraint marketing_audit_log_entity_type_check
  check (entity_type in (
    'campaign', 'settings', 'target', 'asset', 'placement', 'badge', 'price_rule',
    'product_promotion'
  ));

alter table public.marketing_audit_log
  drop constraint if exists marketing_audit_log_action_check;
alter table public.marketing_audit_log
  add constraint marketing_audit_log_action_check
  check (action in (
    'created', 'updated', 'published', 'paused', 'archived', 'deleted',
    'settings_updated', 'cleanup_failed'
  ));

-- O registro de exclusao de um rascunho precisa sobreviver a campanha.
alter table public.marketing_audit_log
  drop constraint if exists marketing_audit_log_campaign_id_fkey;
alter table public.marketing_audit_log
  add constraint marketing_audit_log_campaign_id_fkey
  foreign key (campaign_id) references public.marketing_campaigns(id) on delete set null;

create table public.product_promotions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  enabled boolean not null default false,
  promotional_price_cents bigint not null check (promotional_price_cents > 0),
  start_at timestamptz,
  end_at timestamptz,
  show_badge boolean not null default true,
  badge_label text not null default 'Promoção'
    check (char_length(btrim(badge_label)) between 1 and 24)
    check (badge_label !~* '<|>|javascript[[:space:]]*:|on[a-z]+[[:space:]]*='),
  badge_tone text not null default 'wine'
    check (badge_tone in ('wine', 'caramel', 'dark', 'success', 'attention')),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at is null or start_at is null or end_at > start_at)
);

create index product_promotions_active_period_idx
  on public.product_promotions(product_id, start_at, end_at)
  where enabled;

create trigger product_promotions_set_updated_at
before update on public.product_promotions
for each row execute function private.set_marketing_child_updated_at();

alter table public.product_promotions enable row level security;
revoke all on public.product_promotions from public;
grant select on public.product_promotions to anon, authenticated;

create policy "public can read active product promotions"
on public.product_promotions
for select
to anon
using (
  enabled
  and (start_at is null or start_at <= now())
  and (end_at is null or now() <= end_at)
  and exists (
    select 1 from public.marketing_settings settings
    where settings.id = 1 and settings.pricing_enabled
  )
);

create policy "authenticated can read active or admin product promotions"
on public.product_promotions
for select
to authenticated
using (
  (
    enabled
    and (start_at is null or start_at <= now())
    and (end_at is null or now() <= end_at)
    and exists (
      select 1 from public.marketing_settings settings
      where settings.id = 1 and settings.pricing_enabled
    )
  )
  or (select private.is_admin())
);

create or replace function private.record_product_promotion_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Acesso administrativo necessario';
  end if;

  insert into public.marketing_audit_log(
    entity_type, entity_id, campaign_id, action, actor_id, before_data, after_data
  ) values (
    'product_promotion',
    case when tg_op = 'INSERT' then new.id::text else old.id::text end,
    null,
    case when tg_op = 'INSERT' then 'created' else 'updated' end,
    auth.uid(),
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );
  return new;
end;
$$;

revoke all on function private.record_product_promotion_audit() from public;

create trigger product_promotions_audit
after insert or update on public.product_promotions
for each row execute function private.record_product_promotion_audit();

create or replace function public.admin_upsert_product_promotion(
  requested_product_id uuid,
  expected_version integer,
  promotion_payload jsonb
)
returns public.product_promotions
language plpgsql
security definer
set search_path = ''
as $$
declare
  product_row public.products%rowtype;
  current_promotion public.product_promotions%rowtype;
  saved public.product_promotions%rowtype;
  requested_price_cents bigint;
  starts_at timestamptz;
  ends_at timestamptz;
  label text;
begin
  if not private.is_admin() then raise exception 'Acesso administrativo necessario'; end if;
  if requested_product_id is null or jsonb_typeof(promotion_payload) <> 'object' then
    raise exception 'Promocao individual invalida';
  end if;

  select * into product_row from public.products
  where id = requested_product_id and active
  for update;
  if product_row.id is null then raise exception 'Produto nao encontrado'; end if;

  select * into current_promotion from public.product_promotions
  where product_id = requested_product_id
  for update;
  if current_promotion.id is not null
    and current_promotion.version is distinct from expected_version then
    raise exception 'Promocao alterada em outra sessao';
  end if;
  if current_promotion.id is null and expected_version is not null then
    raise exception 'Promocao alterada em outra sessao';
  end if;

  requested_price_cents := nullif(promotion_payload ->> 'promotional_price_cents', '')::bigint;
  starts_at := nullif(promotion_payload ->> 'start_at', '')::timestamptz;
  ends_at := nullif(promotion_payload ->> 'end_at', '')::timestamptz;
  label := btrim(coalesce(nullif(promotion_payload ->> 'badge_label', ''), 'Promoção'));

  if requested_price_cents is null or requested_price_cents <= 0 then
    raise exception 'Preco promocional deve ser maior que zero';
  end if;
  if requested_price_cents >= round(product_row.price * 100)::bigint then
    raise exception 'Preco promocional deve ser menor que o preco normal';
  end if;
  if ends_at is not null and starts_at is not null and ends_at <= starts_at then
    raise exception 'Termino deve ser posterior ao inicio';
  end if;
  if char_length(label) < 1 or char_length(label) > 24
    or label ~* '<|>|javascript[[:space:]]*:|on[a-z]+[[:space:]]*=' then
    raise exception 'Texto do selo invalido';
  end if;
  if coalesce(promotion_payload ->> 'badge_tone', 'wine') not in (
    'wine', 'caramel', 'dark', 'success', 'attention'
  ) then raise exception 'Cor do selo invalida'; end if;

  insert into public.product_promotions(
    product_id, enabled, promotional_price_cents, start_at, end_at,
    show_badge, badge_label, badge_tone
  ) values (
    requested_product_id,
    coalesce((promotion_payload ->> 'enabled')::boolean, false),
    requested_price_cents,
    starts_at,
    ends_at,
    coalesce((promotion_payload ->> 'show_badge')::boolean, true),
    label,
    coalesce(promotion_payload ->> 'badge_tone', 'wine')
  )
  on conflict (product_id) do update set
    enabled = excluded.enabled,
    promotional_price_cents = excluded.promotional_price_cents,
    start_at = excluded.start_at,
    end_at = excluded.end_at,
    show_badge = excluded.show_badge,
    badge_label = excluded.badge_label,
    badge_tone = excluded.badge_tone
  returning * into saved;

  return saved;
end;
$$;

revoke all on function public.admin_upsert_product_promotion(uuid, integer, jsonb) from public;
grant execute on function public.admin_upsert_product_promotion(uuid, integer, jsonb) to authenticated;

create or replace function public.admin_delete_draft_campaign(requested_campaign_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign_row public.marketing_campaigns%rowtype;
  storage_paths text[] := '{}';
begin
  if not private.is_admin() then raise exception 'Acesso administrativo necessario'; end if;

  select * into campaign_row from public.marketing_campaigns
  where id = requested_campaign_id
  for update;
  if campaign_row.id is null then raise exception 'Campanha nao encontrada'; end if;
  if campaign_row.status <> 'draft' or campaign_row.published_at is not null then
    raise exception 'Somente rascunho nunca publicado pode ser excluido';
  end if;
  if exists (
    select 1 from public.orders orders
    where coalesce(orders.pricing_snapshot, '{}'::jsonb)::text like '%' || requested_campaign_id::text || '%'
      or orders.items::text like '%' || requested_campaign_id::text || '%'
  ) then raise exception 'Campanha vinculada a pedido nao pode ser excluida'; end if;

  select coalesce(array_agg(asset.storage_path order by asset.storage_path), '{}')
  into storage_paths
  from public.marketing_campaign_assets asset
  where asset.campaign_id = requested_campaign_id;

  insert into public.marketing_audit_log(
    entity_type, entity_id, campaign_id, action, actor_id, before_data, after_data
  ) values (
    'campaign', campaign_row.id::text, campaign_row.id, 'deleted', auth.uid(),
    to_jsonb(campaign_row), null
  );

  -- A campanha permanece existente enquanto os triggers auditam cada filho.
  -- Placements saem antes dos assets por causa das referencias de imagem.
  delete from public.marketing_campaign_placements where campaign_id = requested_campaign_id;
  delete from public.marketing_campaign_badges where campaign_id = requested_campaign_id;
  delete from public.marketing_campaign_price_rules where campaign_id = requested_campaign_id;
  delete from public.marketing_campaign_targets where campaign_id = requested_campaign_id;
  delete from public.marketing_campaign_assets where campaign_id = requested_campaign_id;
  delete from public.marketing_campaigns where id = requested_campaign_id;
  return storage_paths;
end;
$$;

revoke all on function public.admin_delete_draft_campaign(uuid) from public;
grant execute on function public.admin_delete_draft_campaign(uuid) to authenticated;

create or replace function public.admin_record_campaign_cleanup_failure(
  deleted_campaign_id uuid,
  storage_paths text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Acesso administrativo necessario'; end if;
  insert into public.marketing_audit_log(
    entity_type, entity_id, campaign_id, action, actor_id, before_data, after_data
  ) values (
    'campaign', deleted_campaign_id::text, null, 'cleanup_failed', auth.uid(), null,
    jsonb_build_object('storage_paths', coalesce(storage_paths, '{}'::text[]))
  );
end;
$$;

revoke all on function public.admin_record_campaign_cleanup_failure(uuid, text[]) from public;
grant execute on function public.admin_record_campaign_cleanup_failure(uuid, text[]) to authenticated;

create or replace function public.resolve_product_price_details_v2(
  requested_product_id uuid,
  effective_at timestamptz default now()
)
returns table (
  product_id uuid,
  original_price_cents bigint,
  final_price_cents bigint,
  price_source text,
  individual_promotion_id uuid,
  individual_price_cents bigint,
  individual_badge_label text,
  individual_badge_tone text,
  campaign_price_cents bigint,
  campaign_id uuid,
  campaign_name text,
  rule_type text,
  discount_basis_points integer,
  used_safety_tie_break boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with product_row as (
    select product.id, product.category, round(product.price * 100)::bigint as original_cents
    from public.products product
    where product.id = requested_product_id and product.active
  ), pricing_switch as (
    select settings.enabled as campaigns_enabled, settings.pricing_enabled
    from public.marketing_settings settings where settings.id = 1
  ), individual as (
    select
      promotion.id,
      promotion.promotional_price_cents as final_cents,
      promotion.start_at,
      case when promotion.show_badge then promotion.badge_label end as badge_label,
      case when promotion.show_badge then promotion.badge_tone end as badge_tone,
      round(
        (product_row.original_cents - promotion.promotional_price_cents) * 10000.0
        / product_row.original_cents
      )::integer as discount_bps
    from product_row
    cross join pricing_switch
    join public.product_promotions promotion on promotion.product_id = product_row.id
    where pricing_switch.pricing_enabled
      and promotion.enabled
      and (promotion.start_at is null or promotion.start_at <= effective_at)
      and (promotion.end_at is null or effective_at <= promotion.end_at)
      and promotion.promotional_price_cents > 0
      and promotion.promotional_price_cents < product_row.original_cents
  ), campaign_candidates_base as (
    select
      campaign.id,
      campaign.name,
      campaign.priority,
      campaign.start_at,
      target.target_rank,
      rule.rule_type,
      rule.percentage_basis_points,
      case
        when rule.rule_type = 'manual_price' then rule.promotional_price_cents
        else greatest(1, round(
          product_row.original_cents * (10000 - rule.percentage_basis_points) / 10000.0
        )::bigint)
      end as final_cents
    from product_row
    cross join pricing_switch
    join lateral (
      select
        campaign_target.campaign_id,
        max(case campaign_target.target_type
          when 'product' then 4 when 'category' then 2 else 1
        end) as target_rank
      from public.marketing_campaign_targets campaign_target
      where campaign_target.target_type = 'store'
        or (campaign_target.target_type = 'product' and campaign_target.product_id = product_row.id)
        or (campaign_target.target_type = 'category' and campaign_target.category_slug = product_row.category)
      group by campaign_target.campaign_id
    ) target on true
    join public.marketing_campaigns campaign on campaign.id = target.campaign_id
    join public.marketing_campaign_price_rules rule on rule.campaign_id = campaign.id
      and (
        rule.rule_type = 'percentage'
        or (target.target_rank = 4 and rule.product_id = product_row.id)
      )
    where pricing_switch.pricing_enabled
      and pricing_switch.campaigns_enabled
      and campaign.status = 'published'
      and campaign.start_at <= effective_at
      and (campaign.end_at is null or effective_at < campaign.end_at)
  ), campaign_candidates as (
    select
      candidate.*,
      count(*) over (
        partition by candidate.target_rank, candidate.priority
      ) > 1 as used_tie_break,
      round(
        (product_row.original_cents - candidate.final_cents) * 10000.0
        / product_row.original_cents
      )::integer as discount_bps
    from campaign_candidates_base candidate
    cross join product_row
    where candidate.final_cents > 0 and candidate.final_cents < product_row.original_cents
  ), best_campaign as (
    select * from campaign_candidates
    order by target_rank desc, priority desc, start_at desc, id
    limit 1
  ), all_candidates as (
    select
      case campaign.target_rank when 4 then 'campaign_product'
        when 2 then 'campaign_category' else 'campaign_store' end as source,
      campaign.target_rank as source_rank,
      campaign.priority,
      campaign.start_at as starts_at,
      campaign.id::text as stable_id,
      campaign.final_cents,
      campaign.id as applied_campaign_id,
      campaign.name as applied_campaign_name,
      campaign.rule_type,
      campaign.discount_bps,
      campaign.used_tie_break,
      null::uuid as applied_individual_id
    from campaign_candidates campaign
    union all
    select
      'individual', 3, 0, individual.start_at, individual.id::text,
      individual.final_cents, null::uuid, null::text, 'individual'::text,
      individual.discount_bps, false, individual.id
    from individual
  ), winner as (
    select * from all_candidates
    order by source_rank desc, priority desc, starts_at desc nulls last, stable_id
    limit 1
  )
  select
    product_row.id,
    product_row.original_cents,
    coalesce(winner.final_cents, product_row.original_cents),
    coalesce(winner.source, 'normal'),
    individual.id,
    individual.final_cents,
    individual.badge_label,
    individual.badge_tone,
    best_campaign.final_cents,
    winner.applied_campaign_id,
    winner.applied_campaign_name,
    winner.rule_type,
    winner.discount_bps,
    coalesce(winner.used_tie_break, false)
  from product_row
  left join individual on true
  left join best_campaign on true
  left join winner on true;
$$;

revoke all on function public.resolve_product_price_details_v2(uuid, timestamptz) from public;
grant execute on function public.resolve_product_price_details_v2(uuid, timestamptz) to anon, authenticated;

create or replace function public.resolve_catalog_prices_v2(
  product_ids uuid[],
  effective_at timestamptz default now()
)
returns table (
  product_id uuid,
  original_price_cents bigint,
  final_price_cents bigint,
  price_source text,
  individual_promotion_id uuid,
  individual_price_cents bigint,
  individual_badge_label text,
  individual_badge_tone text,
  campaign_price_cents bigint,
  campaign_id uuid,
  campaign_name text,
  rule_type text,
  discount_basis_points integer,
  used_safety_tie_break boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select resolved.*
  from unnest(product_ids) requested(id)
  cross join lateral public.resolve_product_price_details_v2(requested.id, effective_at) resolved;
$$;

revoke all on function public.resolve_catalog_prices_v2(uuid[], timestamptz) from public;
grant execute on function public.resolve_catalog_prices_v2(uuid[], timestamptz) to anon, authenticated;

create or replace function public.create_trusted_order_v2(
  request_id uuid,
  customer_payload jsonb,
  requested_delivery_method text,
  requested_payment_method text,
  requested_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_order public.orders%rowtype;
  product_row public.products%rowtype;
  price_row record;
  requested jsonb;
  built_items jsonb := '[]'::jsonb;
  snapshots jsonb := '[]'::jsonb;
  subtotal_cents bigint := 0;
  item_quantity integer;
  selected_size text;
  selected_color text;
  item_subtotal bigint;
  order_id uuid := gen_random_uuid();
  lookup_id uuid := gen_random_uuid();
  public_code text := 'J' || upper(substr(replace(order_id::text, '-', ''), 1, 9));
  has_reserved_stock boolean := false;
  current_customer_id uuid := auth.uid();
  customer_name text := btrim(coalesce(customer_payload ->> 'name', ''));
  customer_phone text := regexp_replace(coalesce(customer_payload ->> 'whatsapp', ''), '[^0-9]', '', 'g');
  customer_city text := btrim(coalesce(customer_payload ->> 'city', ''));
  customer_neighborhood text := btrim(coalesce(customer_payload ->> 'neighborhood', ''));
  customer_address text := btrim(coalesce(customer_payload ->> 'address', ''));
  customer_reference text := btrim(coalesce(customer_payload ->> 'reference', ''));
  customer_notes text := btrim(coalesce(customer_payload ->> 'notes', ''));
  request_fingerprint text;
begin
  if left(customer_phone, 2) = '55' and char_length(customer_phone) = 13 then
    customer_phone := substr(customer_phone, 3);
  end if;
  request_fingerprint := md5(
    customer_payload::text || '|' || requested_delivery_method || '|' ||
    requested_payment_method || '|' || requested_items::text
  );

  if request_id is null then raise exception 'Chave de idempotencia obrigatoria'; end if;
  select * into existing_order from public.orders where idempotency_key = request_id;
  if existing_order.id is not null then
    if existing_order.idempotency_fingerprint is distinct from request_fingerprint then
      raise exception 'Chave de idempotencia reutilizada com dados diferentes';
    end if;
    return to_jsonb(existing_order);
  end if;

  if jsonb_typeof(requested_items) <> 'array' or jsonb_array_length(requested_items) = 0 then
    raise exception 'Carrinho vazio';
  end if;
  if jsonb_array_length(requested_items) > 50 then raise exception 'Quantidade de itens acima do limite'; end if;
  if requested_delivery_method not in ('delivery', 'pickup', 'whatsapp') then raise exception 'Forma de entrega invalida'; end if;
  if requested_payment_method not in ('pix', 'card_link', 'whatsapp') then raise exception 'Forma de pagamento invalida'; end if;

  if char_length(customer_name) < 3 or char_length(customer_name) > 120
    or customer_name ~* '<|>|javascript[[:space:]]*:|on[a-z]+[[:space:]]*=' then
    raise exception 'Nome do cliente invalido';
  end if;
  if char_length(customer_phone) <> 11 or substr(customer_phone, 3, 1) <> '9' then
    raise exception 'WhatsApp deve conter DDD e 11 numeros';
  end if;
  if char_length(customer_city) < 2 or char_length(customer_city) > 80 then raise exception 'Cidade invalida'; end if;
  if char_length(customer_neighborhood) > 100 then raise exception 'Bairro acima do limite'; end if;
  if char_length(customer_address) > 180 then raise exception 'Endereco acima do limite'; end if;
  if char_length(customer_reference) > 160 then raise exception 'Referencia acima do limite'; end if;
  if char_length(customer_notes) > 500 then raise exception 'Observacao acima do limite'; end if;
  if requested_delivery_method = 'delivery'
    and (char_length(customer_neighborhood) < 2 or char_length(customer_address) < 3) then
    raise exception 'Bairro e endereco sao obrigatorios para entrega';
  end if;
  if concat_ws(' ', customer_city, customer_neighborhood, customer_address, customer_reference, customer_notes)
    ~* '<|>|javascript[[:space:]]*:|on[a-z]+[[:space:]]*=' then
    raise exception 'Dados do endereco ou observacao invalidos';
  end if;

  for requested in
    select value from jsonb_array_elements(requested_items)
    order by value ->> 'productId'
  loop
    begin
      item_quantity := (requested ->> 'quantity')::integer;
    exception when others then
      raise exception 'Quantidade invalida';
    end;
    if item_quantity < 1 or item_quantity > 99 then raise exception 'Quantidade invalida'; end if;
    selected_size := nullif(btrim(requested ->> 'selectedSize'), '');
    selected_color := nullif(btrim(requested ->> 'selectedColor'), '');

    select * into product_row from public.products
    where id = (requested ->> 'productId')::uuid and active
    for update;
    if product_row.id is null then raise exception 'Produto indisponivel'; end if;
    if array_length(product_row.sizes, 1) > 0
      and (selected_size is null or not selected_size = any(product_row.sizes)) then
      raise exception 'Tamanho invalido';
    end if;
    if array_length(product_row.colors, 1) > 0
      and (selected_color is null or not selected_color = any(product_row.colors)) then
      raise exception 'Cor invalida';
    end if;

    select * into price_row
    from public.resolve_product_price_details_v2(product_row.id, now());
    if price_row.final_price_cents is null or price_row.final_price_cents <= 0 then
      raise exception 'Preco invalido';
    end if;

    if product_row.availability = 'ready' then
      update public.products set stock = stock - item_quantity
      where id = product_row.id and stock >= item_quantity;
      if not found then raise exception 'Estoque insuficiente para %', product_row.name; end if;
      has_reserved_stock := true;
    end if;

    item_subtotal := price_row.final_price_cents * item_quantity;
    subtotal_cents := subtotal_cents + item_subtotal;
    built_items := built_items || jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid(),
      'productId', product_row.id,
      'productName', product_row.name,
      'imageUrl', coalesce(product_row.image_urls[1], ''),
      'unitPrice', price_row.final_price_cents / 100.0,
      'normalUnitPrice', price_row.original_price_cents / 100.0,
      'originalUnitPrice', price_row.original_price_cents / 100.0,
      'individualUnitPrice', price_row.individual_price_cents / 100.0,
      'campaignUnitPrice', price_row.campaign_price_cents / 100.0,
      'priceSource', price_row.price_source,
      'quantity', item_quantity,
      'selectedSize', selected_size,
      'selectedColor', selected_color,
      'availability', product_row.availability,
      'subtotal', item_subtotal / 100.0,
      'individualPromotionId', price_row.individual_promotion_id,
      'campaignId', price_row.campaign_id,
      'campaignName', price_row.campaign_name,
      'promotionType', price_row.rule_type,
      'discountBasisPoints', price_row.discount_basis_points
    ));
    snapshots := snapshots || jsonb_build_array(jsonb_build_object(
      'productId', product_row.id,
      'productName', product_row.name,
      'normalPriceCents', price_row.original_price_cents,
      'originalPriceCents', price_row.original_price_cents,
      'individualPriceCents', price_row.individual_price_cents,
      'campaignPriceCents', price_row.campaign_price_cents,
      'appliedPriceCents', price_row.final_price_cents,
      'finalPriceCents', price_row.final_price_cents,
      'priceSource', price_row.price_source,
      'individualPromotionId', price_row.individual_promotion_id,
      'campaignId', price_row.campaign_id,
      'campaignName', price_row.campaign_name,
      'ruleType', price_row.rule_type,
      'discountBasisPoints', price_row.discount_basis_points,
      'variation', jsonb_build_object('size', selected_size, 'color', selected_color),
      'quantity', item_quantity,
      'subtotalCents', item_subtotal,
      'resolvedAt', now()
    ));
  end loop;

  insert into public.orders(
    id, customer_id, public_code, lookup_token, customer_name, customer_whatsapp,
    city, neighborhood, address, reference, notes, delivery_method, payment_method,
    items, subtotal, delivery_fee, total, status, idempotency_key, idempotency_fingerprint,
    pricing_snapshot, stock_reserved
  ) values (
    order_id, current_customer_id, public_code, lookup_id, customer_name, customer_phone,
    customer_city, customer_neighborhood, customer_address, customer_reference, customer_notes,
    requested_delivery_method, requested_payment_method, built_items, subtotal_cents / 100.0,
    0, subtotal_cents / 100.0, 'pending', request_id, request_fingerprint,
    jsonb_build_object(
      'currency', 'BRL', 'rounding', 'integer_cents',
      'timezone', 'America/Maceio', 'items', snapshots
    ),
    has_reserved_stock
  );

  select * into existing_order from public.orders where id = order_id;
  return to_jsonb(existing_order);
exception when unique_violation then
  select * into existing_order from public.orders where idempotency_key = request_id;
  if existing_order.id is not null and existing_order.idempotency_fingerprint = request_fingerprint then
    return to_jsonb(existing_order);
  end if;
  raise;
end;
$$;

revoke all on function public.create_trusted_order_v2(uuid, jsonb, text, text, jsonb) from public;
grant execute on function public.create_trusted_order_v2(uuid, jsonb, text, text, jsonb) to anon, authenticated;

-- Compatibilidade: clientes ainda no bundle anterior recebem as mesmas
-- validacoes e o mesmo motor seguro durante a janela entre migration e deploy.
create or replace function public.create_trusted_order(
  request_id uuid,
  customer_payload jsonb,
  requested_delivery_method text,
  requested_payment_method text,
  requested_items jsonb
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select public.create_trusted_order_v2(
    request_id,
    customer_payload,
    requested_delivery_method,
    requested_payment_method,
    requested_items
  );
$$;

revoke all on function public.create_trusted_order(uuid, jsonb, text, text, jsonb) from public;
grant execute on function public.create_trusted_order(uuid, jsonb, text, text, jsonb) to anon, authenticated;

-- Validacoes condicionais preservam linhas historicas: uma alteracao de status
-- em pedido antigo nao revalida nem reescreve telefone/endereco legados.
create or replace function private.validate_product_structured_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.name is distinct from old.name then
    new.name := btrim(new.name);
    if char_length(new.name) not between 3 and 120
      or new.name ~* '<|>|javascript[[:space:]]*:|on[a-z]+[[:space:]]*=' then
      raise exception 'Nome do produto invalido';
    end if;
  end if;
  if tg_op = 'INSERT' or new.description is distinct from old.description then
    new.description := btrim(new.description);
    if char_length(new.description) > 2000
      or new.description ~* '<|>|javascript[[:space:]]*:|on[a-z]+[[:space:]]*=' then
      raise exception 'Descricao do produto invalida';
    end if;
  end if;
  if tg_op = 'INSERT' or new.price is distinct from old.price then
    if new.price <= 0 or new.price <> round(new.price, 2) then raise exception 'Preco do produto invalido'; end if;
  end if;
  if tg_op = 'INSERT' or new.stock is distinct from old.stock then
    if new.stock < 0 or new.stock > 999999 then raise exception 'Estoque do produto invalido'; end if;
  end if;
  if tg_op = 'INSERT' or new.sizes is distinct from old.sizes or new.colors is distinct from old.colors then
    if char_length(array_to_string(new.sizes, ',')) > 300
      or char_length(array_to_string(new.colors, ',')) > 300
      or concat_ws(' ', array_to_string(new.sizes, ' '), array_to_string(new.colors, ' '))
        ~* '<|>|javascript[[:space:]]*:|on[a-z]+[[:space:]]*=' then
      raise exception 'Variacoes do produto invalidas';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.validate_product_structured_fields() from public;
create trigger validate_product_structured_fields
before insert or update of name, description, price, stock, sizes, colors on public.products
for each row execute function private.validate_product_structured_fields();

create or replace function private.validate_category_structured_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.name is distinct from old.name then
    new.name := btrim(new.name);
    if char_length(new.name) not between 2 and 80
      or new.name ~* '<|>|javascript[[:space:]]*:|on[a-z]+[[:space:]]*=' then
      raise exception 'Nome da categoria invalido';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.validate_category_structured_fields() from public;
create trigger validate_category_structured_fields
before insert or update of name on public.categories
for each row execute function private.validate_category_structured_fields();

create or replace function private.validate_order_structured_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.customer_whatsapp is distinct from old.customer_whatsapp then
    new.customer_whatsapp := regexp_replace(new.customer_whatsapp, '[^0-9]', '', 'g');
    if left(new.customer_whatsapp, 2) = '55' and char_length(new.customer_whatsapp) = 13 then
      new.customer_whatsapp := substr(new.customer_whatsapp, 3);
    end if;
    if new.customer_whatsapp !~ '^[0-9]{11}$' or substr(new.customer_whatsapp, 3, 1) <> '9' then
      raise exception 'WhatsApp deve conter DDD e 11 numeros';
    end if;
  end if;
  if tg_op = 'INSERT' or new.customer_name is distinct from old.customer_name then
    new.customer_name := btrim(new.customer_name);
    if char_length(new.customer_name) not between 3 and 120
      or new.customer_name ~* '<|>|javascript[[:space:]]*:|on[a-z]+[[:space:]]*=' then
      raise exception 'Nome do cliente invalido';
    end if;
  end if;
  if tg_op = 'INSERT'
    or new.city is distinct from old.city
    or new.neighborhood is distinct from old.neighborhood
    or new.address is distinct from old.address
    or new.reference is distinct from old.reference
    or new.notes is distinct from old.notes then
    if char_length(btrim(new.city)) not between 2 and 80
      or char_length(new.neighborhood) > 100 or char_length(new.address) > 180
      or char_length(new.reference) > 160 or char_length(new.notes) > 500
      or concat_ws(' ', new.city, new.neighborhood, new.address, new.reference, new.notes)
        ~* '<|>|javascript[[:space:]]*:|on[a-z]+[[:space:]]*=' then
      raise exception 'Endereco ou observacao invalida';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.validate_order_structured_fields() from public;
create trigger validate_order_structured_fields
before insert or update of customer_name, customer_whatsapp, city, neighborhood, address, reference, notes
on public.orders for each row execute function private.validate_order_structured_fields();

create or replace function private.validate_store_settings_structured_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.store_name := btrim(new.store_name);
  new.city := btrim(new.city);
  new.whatsapp_number := regexp_replace(coalesce(new.whatsapp_number, ''), '[^0-9]', '', 'g');
  if left(new.whatsapp_number, 2) = '55' and char_length(new.whatsapp_number) = 13 then
    new.whatsapp_number := substr(new.whatsapp_number, 3);
  end if;
  if char_length(new.store_name) not between 2 and 120 or char_length(new.city) not between 2 and 80
    or (new.whatsapp_number <> '' and (new.whatsapp_number !~ '^[0-9]{11}$' or substr(new.whatsapp_number, 3, 1) <> '9'))
    or char_length(new.delivery_message) > 240 or char_length(new.pickup_address) > 240
    or char_length(new.pix_key) > 160 or char_length(new.instagram) > 80
    or concat_ws(' ', new.store_name, new.city, new.delivery_message, new.pickup_address)
      ~* '<|>|javascript[[:space:]]*:|on[a-z]+[[:space:]]*=' then
    raise exception 'Configuracoes da loja invalidas';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_store_settings_structured_fields() from public;
create trigger validate_store_settings_structured_fields
before insert or update on public.store_settings
for each row execute function private.validate_store_settings_structured_fields();

create or replace function private.validate_campaign_structured_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.name is distinct from old.name then
    new.name := btrim(new.name);
    if char_length(new.name) not between 3 and 120
      or new.name ~* '<|>|javascript[[:space:]]*:|on[a-z]+[[:space:]]*=' then
      raise exception 'Nome da campanha invalido';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.validate_campaign_structured_fields() from public;
create trigger validate_campaign_structured_fields
before insert or update of name on public.marketing_campaigns
for each row execute function private.validate_campaign_structured_fields();

-- NOT VALID evita varrer ou alterar dados antigos; as regras passam a valer
-- para novos textos inseridos nos elementos visuais.
alter table public.marketing_campaign_badges
  add constraint marketing_badges_plain_text_check
  check (label !~* '<|>|javascript[[:space:]]*:|on[a-z]+[[:space:]]*=') not valid;
alter table public.marketing_campaign_assets
  add constraint marketing_assets_alt_plain_text_check
  check (alt_text !~* '<|>|javascript[[:space:]]*:|on[a-z]+[[:space:]]*=') not valid;
alter table public.marketing_campaign_placements
  add constraint marketing_placements_plain_text_check
  check (concat_ws(' ', title, subtitle, button_label, destination_search)
    !~* '<|>|javascript[[:space:]]*:|on[a-z]+[[:space:]]*=') not valid;

comment on table public.product_promotions is
  'Promocao individual por produto, independente de campanha e com agendamento opcional.';
comment on function public.resolve_product_price_details_v2(uuid, timestamptz) is
  'Precedencia: campanha direta, promocao individual, campanha de categoria e campanha da loja.';
comment on function public.create_trusted_order_v2(uuid, jsonb, text, text, jsonb) is
  'Cria pedido atomico com preco em centavos resolvido no banco e snapshot imutavel.';
