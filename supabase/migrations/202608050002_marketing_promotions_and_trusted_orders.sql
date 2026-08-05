-- Tarefa 1, Versao 1B: precos confiaveis, pedido atomico e administracao completa.
-- A leitura visual e de precos permanece desligada por padrao.

alter table public.marketing_settings
  add column if not exists pricing_enabled boolean not null default false;

alter table public.marketing_audit_log
  drop constraint if exists marketing_audit_log_entity_type_check;
alter table public.marketing_audit_log
  add constraint marketing_audit_log_entity_type_check
  check (entity_type in ('campaign', 'settings', 'target', 'asset', 'placement', 'badge', 'price_rule'));

create table public.marketing_campaign_price_rules (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  product_id uuid references public.products(id) on delete restrict,
  rule_type text not null check (rule_type in ('percentage', 'manual_price')),
  percentage_basis_points integer
    check (percentage_basis_points between 1 and 9999),
  promotional_price_cents bigint
    check (promotional_price_cents > 0),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (rule_type = 'percentage'
      and product_id is null
      and percentage_basis_points is not null
      and promotional_price_cents is null)
    or
    (rule_type = 'manual_price'
      and product_id is not null
      and percentage_basis_points is null
      and promotional_price_cents is not null)
  )
);

create unique index marketing_price_one_percentage_idx
  on public.marketing_campaign_price_rules(campaign_id)
  where rule_type = 'percentage';

create unique index marketing_price_one_manual_product_idx
  on public.marketing_campaign_price_rules(campaign_id, product_id)
  where rule_type = 'manual_price';

create index marketing_price_rules_product_idx
  on public.marketing_campaign_price_rules(product_id)
  where product_id is not null;

create trigger marketing_price_rules_set_updated_at
before update on public.marketing_campaign_price_rules
for each row execute function private.set_marketing_child_updated_at();

alter table public.marketing_campaign_price_rules enable row level security;
revoke all on public.marketing_campaign_price_rules from public;
grant select on public.marketing_campaign_price_rules to anon, authenticated;
grant insert, update, delete on public.marketing_campaign_price_rules to authenticated;

create policy "public can read active marketing price rules"
on public.marketing_campaign_price_rules
for select
to anon
using (
  exists (
    select 1 from public.marketing_campaigns as campaign
    where campaign.id = marketing_campaign_price_rules.campaign_id
  )
);

create policy "authenticated can read active prices or admin prices"
on public.marketing_campaign_price_rules
for select
to authenticated
using (
  exists (
    select 1 from public.marketing_campaigns as campaign
    where campaign.id = marketing_campaign_price_rules.campaign_id
  )
  or (select private.is_admin())
);

create policy "admins can manage marketing price rules"
on public.marketing_campaign_price_rules
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create or replace function private.record_marketing_price_rule_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Acesso administrativo necessario';
  end if;

  insert into public.marketing_audit_log (
    entity_type, entity_id, campaign_id, action, actor_id, before_data, after_data
  ) values (
    'price_rule',
    case when tg_op = 'INSERT' then new.id::text else old.id::text end,
    case when tg_op = 'INSERT' then new.campaign_id else old.campaign_id end,
    case when tg_op = 'INSERT' then 'created' when tg_op = 'DELETE' then 'deleted' else 'updated' end,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.record_marketing_price_rule_audit() from public;

create trigger marketing_price_rules_audit
after insert or update or delete on public.marketing_campaign_price_rules
for each row execute function private.record_marketing_price_rule_audit();

create or replace function public.admin_marketing_campaign_checklist(campaign_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  campaign public.marketing_campaigns%rowtype;
  errors text[] := '{}';
  warnings text[] := '{}';
  target_count integer;
  placement_count integer;
  affected_products integer;
  pricing_rules integer;
  ambiguous_conflicts integer;
begin
  if not private.is_admin() then raise exception 'Acesso administrativo necessario'; end if;

  select * into campaign from public.marketing_campaigns
  where id = admin_marketing_campaign_checklist.campaign_id;
  if campaign.id is null then raise exception 'Campanha nao encontrada'; end if;

  if campaign.start_at is null then errors := array_append(errors, 'Informe a data e a hora de inicio.'); end if;
  if campaign.end_at is not null and campaign.start_at >= campaign.end_at then
    errors := array_append(errors, 'O termino deve ser posterior ao inicio.');
  end if;

  select count(*) into target_count from public.marketing_campaign_targets
  where marketing_campaign_targets.campaign_id = admin_marketing_campaign_checklist.campaign_id;
  select count(*) into placement_count from public.marketing_campaign_placements
  where marketing_campaign_placements.campaign_id = admin_marketing_campaign_checklist.campaign_id;
  select count(*) into pricing_rules from public.marketing_campaign_price_rules
  where marketing_campaign_price_rules.campaign_id = admin_marketing_campaign_checklist.campaign_id;

  if exists (
    select 1 from public.marketing_campaign_placements as placement
    where placement.campaign_id = admin_marketing_campaign_checklist.campaign_id
      and placement.desktop_asset_id is null
      and placement.mobile_asset_id is null
  ) then errors := array_append(errors, 'Todo banner precisa de pelo menos uma imagem valida.'); end if;

  if exists (
    select 1 from public.marketing_campaign_placements as placement
    where placement.campaign_id = admin_marketing_campaign_checklist.campaign_id
      and ((placement.desktop_asset_id is null) <> (placement.mobile_asset_id is null))
  ) then warnings := array_append(warnings, 'Existe banner com apenas um formato de imagem; confirme a adaptacao na previa.'); end if;

  if (exists (select 1 from public.marketing_campaign_badges
      where marketing_campaign_badges.campaign_id = admin_marketing_campaign_checklist.campaign_id)
      or pricing_rules > 0) and target_count = 0 then
    errors := array_append(errors, 'Selecione produtos, categorias ou toda a loja para usar selo ou promocao.');
  end if;

  if exists (
    select 1
    from public.marketing_campaign_price_rules as rule
    join public.products as product on product.id = rule.product_id
    where rule.campaign_id = admin_marketing_campaign_checklist.campaign_id
      and rule.rule_type = 'manual_price'
      and rule.promotional_price_cents >= round(product.price * 100)::bigint
  ) then errors := array_append(errors, 'O preco promocional manual deve ser menor que o preco original.'); end if;

  select count(*) into ambiguous_conflicts
  from public.marketing_campaigns as other
  where other.id <> admin_marketing_campaign_checklist.campaign_id
    and other.status = 'published'
    and other.priority = campaign.priority
    and exists (select 1 from public.marketing_campaign_price_rules r where r.campaign_id = other.id)
    and pricing_rules > 0
    and coalesce(other.end_at, 'infinity'::timestamptz) > campaign.start_at
    and coalesce(campaign.end_at, 'infinity'::timestamptz) > other.start_at
    and exists (
      select 1
      from public.marketing_campaign_targets mine
      join public.marketing_campaign_targets theirs on theirs.campaign_id = other.id
      where mine.campaign_id = admin_marketing_campaign_checklist.campaign_id
        and (
          mine.target_type = 'store' or theirs.target_type = 'store'
          or (mine.target_type = 'product' and theirs.target_type = 'product' and mine.product_id = theirs.product_id)
          or (mine.target_type = 'category' and theirs.target_type = 'category' and mine.category_slug = theirs.category_slug)
        )
    );

  if ambiguous_conflicts > 0 then
    errors := array_append(errors, 'Existe promocao sobreposta com a mesma prioridade. Ajuste o periodo ou a prioridade.');
  end if;

  select count(distinct product.id) into affected_products
  from public.products as product
  where product.active and exists (
    select 1 from public.marketing_campaign_targets as target
    where target.campaign_id = admin_marketing_campaign_checklist.campaign_id
      and (target.target_type = 'store'
        or (target.target_type = 'product' and target.product_id = product.id)
        or (target.target_type = 'category' and target.category_slug = product.category))
  );

  if placement_count > 2 then warnings := array_append(warnings, 'Use os banners secundarios com moderacao para preservar a Home.'); end if;
  if affected_products = 0 and target_count > 0 then warnings := array_append(warnings, 'A campanha nao afeta nenhum produto ativo no momento.'); end if;

  return jsonb_build_object(
    'errors', to_jsonb(errors),
    'warnings', to_jsonb(warnings),
    'impact', jsonb_build_object(
      'targets', target_count,
      'placements', placement_count,
      'products', affected_products,
      'priceRules', pricing_rules,
      'overlaps', ambiguous_conflicts
    )
  );
end;
$$;

revoke all on function public.admin_marketing_campaign_checklist(uuid) from public;
grant execute on function public.admin_marketing_campaign_checklist(uuid) to authenticated;

create or replace function private.assert_marketing_campaign_publishable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare checklist jsonb;
begin
  if new.status = 'published' and old.status <> 'published' then
    checklist := public.admin_marketing_campaign_checklist(new.id);
    if jsonb_array_length(checklist -> 'errors') > 0 then
      raise exception 'Campanha nao pode ser publicada: %', checklist ->> 'errors';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.assert_marketing_campaign_publishable() from public;

create trigger marketing_campaigns_assert_publishable
before update of status on public.marketing_campaigns
for each row execute function private.assert_marketing_campaign_publishable();

create or replace function public.admin_save_marketing_campaign(
  campaign_id uuid,
  expected_version integer,
  campaign_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  item jsonb;
begin
  if not private.is_admin() then raise exception 'Acesso administrativo necessario'; end if;
  if jsonb_typeof(campaign_payload) <> 'object' then raise exception 'Configuracao de campanha invalida'; end if;

  select version into current_version from public.marketing_campaigns where id = campaign_id for update;
  if current_version is null then raise exception 'Campanha nao encontrada'; end if;
  if current_version <> expected_version then raise exception 'Campanha alterada em outra sessão'; end if;

  update public.marketing_campaigns set
    name = btrim(campaign_payload ->> 'name'),
    start_at = nullif(campaign_payload ->> 'start_at', '')::timestamptz,
    end_at = nullif(campaign_payload ->> 'end_at', '')::timestamptz,
    priority = coalesce((campaign_payload ->> 'priority')::integer, 0)
  where id = campaign_id;

  delete from public.marketing_campaign_targets where marketing_campaign_targets.campaign_id = admin_save_marketing_campaign.campaign_id;
  for item in select value from jsonb_array_elements(coalesce(campaign_payload -> 'targets', '[]'::jsonb)) loop
    insert into public.marketing_campaign_targets(id, campaign_id, target_type, product_id, category_slug, include_new_products)
    values (
      coalesce(nullif(item ->> 'id', '')::uuid, gen_random_uuid()), campaign_id, item ->> 'target_type',
      nullif(item ->> 'product_id', '')::uuid, nullif(item ->> 'category_slug', ''),
      coalesce((item ->> 'include_new_products')::boolean, false)
    );
  end loop;

  for item in select value from jsonb_array_elements(coalesce(campaign_payload -> 'assets', '[]'::jsonb)) loop
    insert into public.marketing_campaign_assets(
      id, campaign_id, storage_path, format, mime_type, byte_size, width, height,
      alt_text, focal_x, focal_y, zoom, lifecycle_status, recover_after
    ) values (
      (item ->> 'id')::uuid, campaign_id, item ->> 'storage_path', item ->> 'format',
      item ->> 'mime_type', (item ->> 'byte_size')::bigint, (item ->> 'width')::integer,
      (item ->> 'height')::integer, item ->> 'alt_text', (item ->> 'focal_x')::numeric,
      (item ->> 'focal_y')::numeric, (item ->> 'zoom')::numeric, 'active', null
    ) on conflict (id) do update set
      alt_text = excluded.alt_text, focal_x = excluded.focal_x, focal_y = excluded.focal_y,
      zoom = excluded.zoom, lifecycle_status = 'active', recover_after = null;
  end loop;

  update public.marketing_campaign_assets as asset
  set lifecycle_status = 'pending_deletion', recover_after = now() + interval '7 days'
  where asset.campaign_id = admin_save_marketing_campaign.campaign_id
    and not exists (
      select 1 from jsonb_array_elements(coalesce(campaign_payload -> 'assets', '[]'::jsonb)) value
      where (value ->> 'id')::uuid = asset.id
    );

  delete from public.marketing_campaign_placements where marketing_campaign_placements.campaign_id = admin_save_marketing_campaign.campaign_id;
  for item in select value from jsonb_array_elements(coalesce(campaign_payload -> 'placements', '[]'::jsonb)) loop
    insert into public.marketing_campaign_placements(
      id, campaign_id, position, title, subtitle, button_label, desktop_asset_id,
      mobile_asset_id, destination_type, destination_product_id,
      destination_category_slug, destination_search, destination_url, sort_order
    ) values (
      coalesce(nullif(item ->> 'id', '')::uuid, gen_random_uuid()), campaign_id,
      item ->> 'position', coalesce(item ->> 'title', ''), coalesce(item ->> 'subtitle', ''),
      coalesce(item ->> 'button_label', ''), nullif(item ->> 'desktop_asset_id', '')::uuid,
      nullif(item ->> 'mobile_asset_id', '')::uuid, coalesce(item ->> 'destination_type', 'none'),
      nullif(item ->> 'destination_product_id', '')::uuid, nullif(item ->> 'destination_category_slug', ''),
      nullif(item ->> 'destination_search', ''), nullif(item ->> 'destination_url', ''),
      coalesce((item ->> 'sort_order')::integer, 0)
    );
  end loop;

  delete from public.marketing_campaign_badges where marketing_campaign_badges.campaign_id = admin_save_marketing_campaign.campaign_id;
  if campaign_payload -> 'badge' is not null and jsonb_typeof(campaign_payload -> 'badge') = 'object' then
    item := campaign_payload -> 'badge';
    insert into public.marketing_campaign_badges(id, campaign_id, label, tone)
    values (coalesce(nullif(item ->> 'id', '')::uuid, gen_random_uuid()), campaign_id, item ->> 'label', item ->> 'tone');
  end if;

  delete from public.marketing_campaign_price_rules where marketing_campaign_price_rules.campaign_id = admin_save_marketing_campaign.campaign_id;
  for item in select value from jsonb_array_elements(coalesce(campaign_payload -> 'price_rules', '[]'::jsonb)) loop
    insert into public.marketing_campaign_price_rules(
      id, campaign_id, product_id, rule_type, percentage_basis_points, promotional_price_cents
    ) values (
      coalesce(nullif(item ->> 'id', '')::uuid, gen_random_uuid()), campaign_id,
      nullif(item ->> 'product_id', '')::uuid, item ->> 'rule_type',
      nullif(item ->> 'percentage_basis_points', '')::integer,
      nullif(item ->> 'promotional_price_cents', '')::bigint
    );
  end loop;

  return campaign_id;
end;
$$;

revoke all on function public.admin_save_marketing_campaign(uuid, integer, jsonb) from public;
grant execute on function public.admin_save_marketing_campaign(uuid, integer, jsonb) to authenticated;

create or replace function public.resolve_product_price_details(
  requested_product_id uuid,
  effective_at timestamptz default now()
)
returns table (
  product_id uuid,
  original_price_cents bigint,
  final_price_cents bigint,
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
    select id, category, round(price * 100)::bigint as original_cents
    from public.products where id = requested_product_id and active
  ), candidates as (
    select
      campaign.id,
      campaign.name,
      campaign.priority,
      campaign.start_at,
      target.target_type,
      case target.target_type when 'product' then 3 when 'category' then 2 else 1 end as target_rank,
      rule.rule_type,
      rule.percentage_basis_points,
      rule.promotional_price_cents,
      product_row.original_cents,
      count(*) over (
        partition by case target.target_type when 'product' then 3 when 'category' then 2 else 1 end, campaign.priority
      ) > 1 as used_tie_break
    from product_row
    join public.marketing_campaign_targets target on (
      target.target_type = 'store'
      or (target.target_type = 'product' and target.product_id = product_row.id)
      or (target.target_type = 'category' and target.category_slug = product_row.category)
    )
    join public.marketing_campaigns campaign on campaign.id = target.campaign_id
    join public.marketing_campaign_price_rules rule on rule.campaign_id = campaign.id
      and (rule.rule_type = 'percentage' or rule.product_id = product_row.id)
    where campaign.status = 'published'
      and campaign.start_at <= effective_at
      and (campaign.end_at is null or effective_at < campaign.end_at)
      and exists (
        select 1 from public.marketing_settings settings
        where settings.id = 1 and settings.enabled and settings.pricing_enabled
      )
  ), winner as (
    select * from candidates
    order by target_rank desc, priority desc, start_at desc, id
    limit 1
  )
  select
    product_row.id,
    product_row.original_cents,
    case
      when winner.id is null then product_row.original_cents
      when winner.rule_type = 'manual_price' then winner.promotional_price_cents
      else greatest(1, round(product_row.original_cents * (10000 - winner.percentage_basis_points) / 10000.0)::bigint)
    end,
    winner.id,
    winner.name,
    winner.rule_type,
    winner.percentage_basis_points,
    coalesce(winner.used_tie_break, false)
  from product_row left join winner on true;
$$;

revoke all on function public.resolve_product_price_details(uuid, timestamptz) from public;

create or replace function public.resolve_catalog_prices(
  product_ids uuid[],
  effective_at timestamptz default now()
)
returns table (
  product_id uuid,
  original_price_cents bigint,
  final_price_cents bigint,
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
  cross join lateral public.resolve_product_price_details(requested.id, effective_at) resolved;
$$;

revoke all on function public.resolve_catalog_prices(uuid[], timestamptz) from public;
grant execute on function public.resolve_catalog_prices(uuid[], timestamptz) to anon, authenticated;
grant execute on function public.resolve_product_price_details(uuid, timestamptz) to anon, authenticated;

alter table public.orders
  add column if not exists idempotency_key uuid,
  add column if not exists idempotency_fingerprint text,
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists stock_reserved boolean not null default false;

create unique index if not exists orders_idempotency_key_unique
  on public.orders(idempotency_key)
  where idempotency_key is not null;

drop trigger if exists adjust_stock_after_order_status on public.orders;

create or replace function private.adjust_stock_on_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare item jsonb; item_product_id uuid; item_quantity integer;
begin
  if not private.is_admin() then raise exception 'Acesso administrativo necessario'; end if;
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'Pedido cancelado nao pode ser reaberto';
  end if;

  if old.stock_reserved and old.status <> 'cancelled' and new.status = 'cancelled' then
    for item in select * from jsonb_array_elements(old.items) loop
      if item ->> 'availability' = 'ready' then
        item_product_id := (item ->> 'productId')::uuid;
        item_quantity := greatest((item ->> 'quantity')::integer, 1);
        update public.products set stock = stock + item_quantity where id = item_product_id;
      end if;
    end loop;
    new.stock_reserved := false;
  elsif not old.stock_reserved
    and old.status = 'pending'
    and new.status in ('confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed') then
    for item in select * from jsonb_array_elements(old.items) loop
      if item ->> 'availability' = 'ready' then
        item_product_id := (item ->> 'productId')::uuid;
        item_quantity := greatest((item ->> 'quantity')::integer, 1);
        update public.products set stock = stock - item_quantity
        where id = item_product_id and stock >= item_quantity;
        if not found then raise exception 'Estoque insuficiente para confirmar o pedido'; end if;
      end if;
    end loop;
    new.stock_reserved := true;
  end if;
  return new;
end;
$$;

create trigger adjust_stock_after_order_status
before update of status on public.orders
for each row execute function private.adjust_stock_on_order_status();

drop policy if exists "public can create pending orders" on public.orders;
revoke insert on public.orders from anon, authenticated;

create or replace function public.create_trusted_order(
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
  request_fingerprint text := md5(
    customer_payload::text || '|' || requested_delivery_method || '|' ||
    requested_payment_method || '|' || requested_items::text
  );
begin
  if request_id is null then raise exception 'Chave de idempotencia obrigatoria'; end if;
  select * into existing_order from public.orders where idempotency_key = request_id;
  if existing_order.id is not null then
    if existing_order.idempotency_fingerprint is distinct from request_fingerprint then
      raise exception 'Chave de idempotencia reutilizada com dados diferentes';
    end if;
    return to_jsonb(existing_order);
  end if;
  if jsonb_typeof(requested_items) <> 'array' or jsonb_array_length(requested_items) = 0 then raise exception 'Carrinho vazio'; end if;
  if jsonb_array_length(requested_items) > 50 then raise exception 'Quantidade de itens acima do limite'; end if;
  if requested_delivery_method not in ('delivery', 'pickup', 'whatsapp') then raise exception 'Forma de entrega invalida'; end if;
  if requested_payment_method not in ('pix', 'card_link', 'whatsapp') then raise exception 'Forma de pagamento invalida'; end if;
  if char_length(btrim(coalesce(customer_payload ->> 'name', ''))) < 3 then raise exception 'Nome do cliente invalido'; end if;
  if char_length(regexp_replace(coalesce(customer_payload ->> 'whatsapp', ''), '\\D', '', 'g')) < 10 then raise exception 'WhatsApp invalido'; end if;

  for requested in
    select value from jsonb_array_elements(requested_items)
    order by value ->> 'productId'
  loop
    item_quantity := coalesce((requested ->> 'quantity')::integer, 0);
    if item_quantity < 1 or item_quantity > 99 then raise exception 'Quantidade invalida'; end if;
    selected_size := nullif(btrim(requested ->> 'selectedSize'), '');
    selected_color := nullif(btrim(requested ->> 'selectedColor'), '');

    select * into product_row from public.products
    where id = (requested ->> 'productId')::uuid and active for update;
    if product_row.id is null then raise exception 'Produto indisponivel'; end if;
    if array_length(product_row.sizes, 1) > 0 and (selected_size is null or not selected_size = any(product_row.sizes)) then raise exception 'Tamanho invalido'; end if;
    if array_length(product_row.colors, 1) > 0 and (selected_color is null or not selected_color = any(product_row.colors)) then raise exception 'Cor invalida'; end if;

    select * into price_row from public.resolve_product_price_details(product_row.id, now());
    if price_row.final_price_cents is null or price_row.final_price_cents <= 0 then raise exception 'Preco invalido'; end if;

    if product_row.availability = 'ready' then
      update public.products set stock = stock - item_quantity
      where id = product_row.id and stock >= item_quantity;
      if not found then raise exception 'Estoque insuficiente para %', product_row.name; end if;
      has_reserved_stock := true;
    end if;

    item_subtotal := price_row.final_price_cents * item_quantity;
    subtotal_cents := subtotal_cents + item_subtotal;
    built_items := built_items || jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid(), 'productId', product_row.id, 'productName', product_row.name,
      'imageUrl', coalesce(product_row.image_urls[1], ''),
      'unitPrice', price_row.final_price_cents / 100.0, 'quantity', item_quantity,
      'selectedSize', selected_size, 'selectedColor', selected_color,
      'availability', product_row.availability, 'subtotal', item_subtotal / 100.0,
      'originalUnitPrice', price_row.original_price_cents / 100.0,
      'campaignId', price_row.campaign_id, 'campaignName', price_row.campaign_name,
      'promotionType', price_row.rule_type, 'discountBasisPoints', price_row.discount_basis_points
    ));
    snapshots := snapshots || jsonb_build_array(jsonb_build_object(
      'productId', product_row.id, 'productName', product_row.name,
      'originalPriceCents', price_row.original_price_cents,
      'finalPriceCents', price_row.final_price_cents,
      'campaignId', price_row.campaign_id, 'campaignName', price_row.campaign_name,
      'ruleType', price_row.rule_type, 'discountBasisPoints', price_row.discount_basis_points,
      'quantity', item_quantity, 'subtotalCents', item_subtotal, 'resolvedAt', now()
    ));
  end loop;

  insert into public.orders(
    id, customer_id, public_code, lookup_token, customer_name, customer_whatsapp,
    city, neighborhood, address, reference, notes, delivery_method, payment_method,
    items, subtotal, delivery_fee, total, status, idempotency_key, idempotency_fingerprint,
    pricing_snapshot, stock_reserved
  ) values (
    order_id, current_customer_id, public_code, lookup_id, btrim(customer_payload ->> 'name'),
    btrim(customer_payload ->> 'whatsapp'), btrim(coalesce(customer_payload ->> 'city', '')),
    btrim(coalesce(customer_payload ->> 'neighborhood', '')), btrim(coalesce(customer_payload ->> 'address', '')),
    btrim(coalesce(customer_payload ->> 'reference', '')), btrim(coalesce(customer_payload ->> 'notes', '')),
    requested_delivery_method, requested_payment_method, built_items, subtotal_cents / 100.0,
    0, subtotal_cents / 100.0, 'pending', request_id, request_fingerprint,
    jsonb_build_object('currency', 'BRL', 'rounding', 'half_away_from_zero', 'items', snapshots),
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

revoke all on function public.create_trusted_order(uuid, jsonb, text, text, jsonb) from public;
grant execute on function public.create_trusted_order(uuid, jsonb, text, text, jsonb) to anon, authenticated;

-- Limpeza oportunista e gratuita: o painel administrativo processa somente
-- arquivos vencidos, sem referências e fora de campanhas arquivadas.
create or replace function public.admin_marketing_asset_cleanup_candidates()
returns table (asset_id uuid, storage_path text)
language sql
stable
security invoker
set search_path = ''
as $$
  select asset.id, asset.storage_path
  from public.marketing_campaign_assets asset
  join public.marketing_campaigns campaign on campaign.id = asset.campaign_id
  where private.is_admin()
    and asset.lifecycle_status = 'pending_deletion'
    and asset.recover_after <= now()
    and campaign.status <> 'archived'
    and not exists (
      select 1 from public.marketing_campaign_placements placement
      where placement.desktop_asset_id = asset.id or placement.mobile_asset_id = asset.id
    )
  order by asset.recover_after
  limit 25;
$$;

revoke all on function public.admin_marketing_asset_cleanup_candidates() from public;
grant execute on function public.admin_marketing_asset_cleanup_candidates() to authenticated;

create or replace function public.admin_marketing_asset_cleanup_result(
  requested_asset_id uuid,
  succeeded boolean,
  failure_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare asset_row public.marketing_campaign_assets%rowtype;
begin
  if not private.is_admin() then raise exception 'Acesso administrativo necessario'; end if;
  select asset.* into asset_row
  from public.marketing_campaign_assets asset
  join public.marketing_campaigns campaign on campaign.id = asset.campaign_id
  where asset.id = requested_asset_id
    and asset.lifecycle_status = 'pending_deletion'
    and asset.recover_after <= now()
    and campaign.status <> 'archived'
    and not exists (
      select 1 from public.marketing_campaign_placements placement
      where placement.desktop_asset_id = asset.id or placement.mobile_asset_id = asset.id
    )
  for update of asset;

  if asset_row.id is null then return; end if;
  if succeeded then
    delete from public.marketing_campaign_assets where id = asset_row.id;
  else
    insert into public.marketing_audit_log(
      entity_type, entity_id, campaign_id, action, actor_id, before_data, after_data
    ) values (
      'asset', asset_row.id::text, asset_row.campaign_id, 'cleanup_failed', auth.uid(),
      to_jsonb(asset_row),
      jsonb_build_object('message', left(coalesce(failure_message, 'Falha sem detalhes'), 240))
    );
  end if;
end;
$$;

revoke all on function public.admin_marketing_asset_cleanup_result(uuid, boolean, text) from public;
grant execute on function public.admin_marketing_asset_cleanup_result(uuid, boolean, text) to authenticated;
