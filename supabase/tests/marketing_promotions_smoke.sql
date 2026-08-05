-- Teste transacional gratuito: todas as alteracoes deste arquivo sofrem rollback.
begin;

do $test$
declare
  admin_id uuid;
  chosen public.products%rowtype;
  base_cents bigint;
  promo_cents bigint;
  direct_id uuid := gen_random_uuid();
  category_id uuid := gen_random_uuid();
  store_id uuid := gen_random_uuid();
  draft_id uuid := gen_random_uuid();
  resolved record;
  deleted_paths text[];
  order_result jsonb;
  before_orders bigint;
  chosen_size text;
  chosen_color text;
begin
  select id into admin_id from public.profiles where role = 'admin' limit 1;
  if admin_id is null then raise exception 'Administrador de teste ausente'; end if;
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', admin_id, 'role', 'authenticated')::text,
    true
  );

  select * into chosen
  from public.products
  where active and price >= 10 and (availability = 'custom' or stock > 0)
  order by (availability = 'custom') desc, created_at
  limit 1 for update;
  if chosen.id is null then raise exception 'Produto de teste ausente'; end if;
  base_cents := round(chosen.price * 100)::bigint;
  promo_cents := greatest(1, floor(base_cents * 0.80)::bigint);

  insert into public.product_promotions(
    product_id, enabled, promotional_price_cents, show_badge, badge_label
  ) values (chosen.id, true, promo_cents, true, 'Promoção');
  select * into resolved from public.resolve_product_price_details_v2(chosen.id, now());
  if resolved.price_source <> 'individual' or resolved.final_price_cents <> promo_cents then
    raise exception 'Precedencia individual incorreta: %', resolved.price_source;
  end if;

  insert into public.marketing_campaigns(id, name, status, start_at, published_at, priority)
  values (direct_id, 'Teste direto rollback', 'published', now() - interval '1 hour', now(), 0);
  insert into public.marketing_campaign_targets(campaign_id, target_type, product_id)
  values (direct_id, 'product', chosen.id);
  insert into public.marketing_campaign_price_rules(campaign_id, rule_type, percentage_basis_points)
  values (direct_id, 'percentage', 3000);
  select * into resolved from public.resolve_product_price_details_v2(chosen.id, now());
  if resolved.price_source <> 'campaign_product' or resolved.campaign_id <> direct_id then
    raise exception 'Campanha direta nao venceu: %', resolved.price_source;
  end if;

  insert into public.marketing_campaigns(id, name, status, start_at, published_at, priority)
  values (category_id, 'Teste categoria rollback', 'published', now() - interval '30 minutes', now(), 900);
  insert into public.marketing_campaign_targets(campaign_id, target_type, category_slug)
  values (category_id, 'category', chosen.category);
  insert into public.marketing_campaign_price_rules(campaign_id, rule_type, percentage_basis_points)
  values (category_id, 'percentage', 4000);
  select * into resolved from public.resolve_product_price_details_v2(chosen.id, now());
  if resolved.price_source <> 'campaign_product' then
    raise exception 'Categoria sobrepos campanha direta';
  end if;

  update public.marketing_campaigns set status = 'paused' where id = direct_id;
  select * into resolved from public.resolve_product_price_details_v2(chosen.id, now());
  if resolved.price_source <> 'individual' then
    raise exception 'Individual nao venceu categoria: %', resolved.price_source;
  end if;

  update public.product_promotions set enabled = false where product_id = chosen.id;
  select * into resolved from public.resolve_product_price_details_v2(chosen.id, now());
  if resolved.price_source <> 'campaign_category' or resolved.campaign_id <> category_id then
    raise exception 'Categoria nao venceu sem individual: %', resolved.price_source;
  end if;

  update public.marketing_campaigns set status = 'archived' where id = category_id;
  insert into public.marketing_campaigns(id, name, status, start_at, published_at, priority)
  values (store_id, 'Teste loja rollback', 'published', now() - interval '20 minutes', now(), 0);
  insert into public.marketing_campaign_targets(campaign_id, target_type)
  values (store_id, 'store');
  insert into public.marketing_campaign_price_rules(campaign_id, rule_type, percentage_basis_points)
  values (store_id, 'percentage', 1000);
  select * into resolved from public.resolve_product_price_details_v2(chosen.id, now());
  if resolved.price_source <> 'campaign_store' or resolved.campaign_id <> store_id then
    raise exception 'Loja nao venceu: %', resolved.price_source;
  end if;

  update public.marketing_campaigns set status = 'archived' where id = store_id;
  update public.product_promotions set enabled = true where product_id = chosen.id;

  insert into public.marketing_campaigns(id, name, status)
  values (draft_id, 'Rascunho rollback', 'draft');
  insert into public.marketing_campaign_targets(campaign_id, target_type, product_id)
  values (draft_id, 'product', chosen.id);
  insert into public.marketing_campaign_assets(
    campaign_id, storage_path, format, mime_type, byte_size, width, height, alt_text
  ) values (
    draft_id, admin_id::text || '/rollback/teste.webp', 'desktop', 'image/webp',
    100, 1200, 500, 'Teste'
  );
  deleted_paths := public.admin_delete_draft_campaign(draft_id);
  if exists(select 1 from public.marketing_campaigns where id = draft_id) then
    raise exception 'Rascunho nao excluido';
  end if;
  if deleted_paths <> array[admin_id::text || '/rollback/teste.webp'] then
    raise exception 'Caminho de imagem nao retornado';
  end if;
  if not exists(
    select 1 from public.marketing_audit_log
    where entity_id = draft_id::text and action = 'deleted' and campaign_id is null
  ) then raise exception 'Auditoria de exclusao ausente'; end if;

  select count(*) into before_orders from public.orders;
  chosen_size := case when array_length(chosen.sizes, 1) > 0 then chosen.sizes[1] else null end;
  chosen_color := case when array_length(chosen.colors, 1) > 0 then chosen.colors[1] else null end;
  order_result := public.create_trusted_order_v2(
    gen_random_uuid(),
    jsonb_build_object(
      'name', 'Cliente Teste', 'whatsapp', '79999999999', 'city', 'Maceió'
    ),
    'pickup',
    'pix',
    jsonb_build_array(jsonb_build_object(
      'productId', chosen.id, 'quantity', 1,
      'selectedSize', chosen_size, 'selectedColor', chosen_color
    ))
  );
  if (select count(*) from public.orders) <> before_orders + 1 then
    raise exception 'Pedido atomico nao criado';
  end if;
  if order_result -> 'pricing_snapshot' -> 'items' -> 0 ->> 'appliedPriceCents' is null
    or order_result -> 'pricing_snapshot' -> 'items' -> 0 ->> 'priceSource' <> 'individual' then
    raise exception 'Snapshot de preco incompleto';
  end if;
end
$test$;

select 'smoke_ok' as result;
rollback;
