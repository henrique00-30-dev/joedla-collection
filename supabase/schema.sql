-- Joedla Collection
-- Execute uma única vez no SQL Editor do projeto Supabase.
-- Este arquivo cria somente estruturas e regras de segurança.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'viewer' check (role in ('viewer', 'admin')),
  created_at timestamptz not null default now()
);

create table public.categories (
  slug text primary key check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 80),
  image_url text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index categories_normalized_name_unique
  on public.categories (lower(btrim(name)));

create index categories_active_sort_idx
  on public.categories (sort_order, name)
  where active;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 120),
  description text not null default '',
  category text not null references public.categories (slug),
  price numeric(12, 2) not null check (price > 0),
  image_urls text[] not null default '{}',
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  availability text not null check (availability in ('ready', 'custom')),
  stock integer not null default 0 check (stock >= 0),
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index products_active_created_idx
  on public.products (created_at desc)
  where active;

create index products_active_category_created_idx
  on public.products (category, created_at desc)
  where active;

create unique index products_active_normalized_name_unique
  on public.products (lower(btrim(name)))
  where active;

create table public.store_settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null,
  city text not null,
  whatsapp_number text not null default '',
  pix_key text not null default '',
  pickup_address text not null default '',
  instagram text not null default '',
  delivery_message text not null,
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key,
  public_code text not null unique check (char_length(public_code) between 5 and 20),
  lookup_token uuid not null unique,
  customer_name text not null check (char_length(customer_name) between 3 and 120),
  customer_whatsapp text not null check (char_length(customer_whatsapp) between 10 and 24),
  city text not null,
  neighborhood text not null default '',
  address text not null default '',
  reference text not null default '',
  notes text not null default '',
  delivery_method text not null
    check (delivery_method in ('delivery', 'pickup', 'whatsapp')),
  payment_method text not null
    check (payment_method in ('pix', 'card_link', 'whatsapp')),
  items jsonb not null
    check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  subtotal numeric(12, 2) not null check (subtotal > 0),
  delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  total numeric(12, 2) not null check (total > 0),
  status text not null default 'pending'
    check (
      status in (
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'out_for_delivery',
        'completed',
        'cancelled'
      )
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = subtotal + delivery_fee)
);

create index orders_status_created_idx
  on public.orders (status, created_at desc);

create index orders_created_idx
  on public.orders (created_at desc);

create index orders_pending_created_idx
  on public.orders (created_at desc)
  where status = 'pending';

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  event_type text not null check (event_type in ('site_visit', 'product_view')),
  product_id uuid references public.products (id) on delete set null,
  visit_date date not null default ((now() at time zone 'utc')::date),
  created_at timestamptz not null default now(),
  check (
    (event_type = 'site_visit' and product_id is null)
    or (event_type = 'product_view' and product_id is not null)
  )
);

create unique index analytics_one_visit_per_day_idx
  on public.analytics_events (visitor_id, visit_date)
  where event_type = 'site_visit';

create unique index analytics_one_product_view_per_day_idx
  on public.analytics_events (visitor_id, product_id, visit_date)
  where event_type = 'product_view';

create index analytics_events_created_idx
  on public.analytics_events (created_at desc);

create index analytics_product_views_idx
  on public.analytics_events (product_id, created_at desc)
  where event_type = 'product_view';

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Administradora'));
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
    );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

create or replace function public.record_analytics_event(
  event_visitor_id uuid,
  event_kind text,
  event_product_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if event_kind not in ('site_visit', 'product_view') then
    raise exception 'Tipo de evento inválido';
  end if;

  if event_kind = 'site_visit' and event_product_id is not null then
    raise exception 'Acesso geral não aceita produto';
  end if;

  if event_kind = 'product_view' and event_product_id is null then
    raise exception 'Visualização exige produto';
  end if;

  insert into public.analytics_events (visitor_id, event_type, product_id)
  values (event_visitor_id, event_kind, event_product_id)
  on conflict do nothing;
end;
$$;

revoke all on function public.record_analytics_event(uuid, text, uuid) from public;
grant execute on function public.record_analytics_event(uuid, text, uuid) to anon, authenticated;

create or replace function public.admin_analytics_summary(period_days integer default 30)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  safe_days integer := least(greatest(coalesce(period_days, 30), 1), 3650);
begin
  if not private.is_admin() then
    raise exception 'Acesso administrativo necessário';
  end if;

  return (
    with period_events as (
      select event_type, visitor_id, product_id
      from public.analytics_events
      where created_at >= now() - make_interval(days => safe_days)
    ),
    viewed as (
      select
        event.product_id::text as product_id,
        coalesce(product.name, 'Produto removido') as product_name,
        count(*)::integer as metric_count
      from period_events as event
      left join public.products as product on product.id = event.product_id
      where event.event_type = 'product_view'
      group by event.product_id, product.name
      order by metric_count desc, product_name
      limit 10
    ),
    purchased as (
      select
        coalesce(item ->> 'productId', '') as product_id,
        coalesce(max(item ->> 'productName'), 'Produto') as product_name,
        sum(
          case
            when coalesce(item ->> 'quantity', '') ~ '^[0-9]+$'
              then (item ->> 'quantity')::integer
            else 0
          end
        )::integer as metric_count
      from public.orders as order_row
      cross join lateral jsonb_array_elements(order_row.items) as item
      where order_row.created_at >= now() - make_interval(days => safe_days)
        and order_row.status <> 'cancelled'
      group by coalesce(item ->> 'productId', '')
      order by metric_count desc, product_name
      limit 10
    )
    select jsonb_build_object(
      'periodDays', safe_days,
      'uniqueVisitors', (
        select count(distinct visitor_id)::integer from period_events
        where event_type = 'site_visit'
      ),
      'totalVisits', (
        select count(*)::integer from period_events where event_type = 'site_visit'
      ),
      'productViews', (
        select count(*)::integer from period_events where event_type = 'product_view'
      ),
      'orders', (
        select count(*)::integer
        from public.orders
        where created_at >= now() - make_interval(days => safe_days)
          and status <> 'cancelled'
      ),
      'topViewed', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'productId', product_id,
              'name', product_name,
              'count', metric_count
            )
            order by metric_count desc, product_name
          )
          from viewed
        ),
        '[]'::jsonb
      ),
      'topPurchased', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'productId', product_id,
              'name', product_name,
              'count', metric_count
            )
            order by metric_count desc, product_name
          )
          from purchased
        ),
        '[]'::jsonb
      )
    )
  );
end;
$$;

revoke all on function public.admin_analytics_summary(integer) from public;
grant execute on function public.admin_analytics_summary(integer) to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;

create trigger orders_set_updated_at
before update on public.orders
for each row execute function private.set_updated_at();

create trigger settings_set_updated_at
before update on public.store_settings
for each row execute function private.set_updated_at();

create or replace function private.adjust_stock_on_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  item_product_id uuid;
  item_quantity integer;
  item_availability text;
  current_stock integer;
  old_reserved boolean;
  new_reserved boolean;
begin
  if not private.is_admin() then
    raise exception 'Acesso administrativo necessário';
  end if;

  old_reserved := old.status in ('confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed');
  new_reserved := new.status in ('confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed');

  if old_reserved = new_reserved then
    return new;
  end if;

  for item in select * from jsonb_array_elements(new.items)
  loop
    item_availability := item ->> 'availability';
    if item_availability <> 'ready' then
      continue;
    end if;

    item_product_id := (item ->> 'productId')::uuid;
    item_quantity := greatest((item ->> 'quantity')::integer, 1);

    if new_reserved then
      select stock
      into current_stock
      from public.products
      where id = item_product_id
      for update;

      if current_stock is null then
        raise exception 'Produto não encontrado no estoque';
      end if;

      if current_stock < item_quantity then
        raise exception 'Estoque insuficiente para confirmar o pedido';
      end if;

      update public.products
      set stock = stock - item_quantity
      where id = item_product_id;
    else
      update public.products
      set stock = stock + item_quantity
      where id = item_product_id;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.adjust_stock_on_order_status() from public;

create trigger adjust_stock_after_order_status
before update of status on public.orders
for each row execute function private.adjust_stock_on_order_status();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.store_settings enable row level security;
alter table public.orders enable row level security;
alter table public.analytics_events enable row level security;

grant usage on schema public to anon, authenticated;
revoke all on public.profiles, public.categories, public.products, public.store_settings, public.orders, public.analytics_events
from public;
grant select on public.categories, public.products, public.store_settings to anon, authenticated;
grant insert on public.orders to anon, authenticated;
grant select on public.profiles to authenticated;
grant insert, update on public.categories, public.products, public.store_settings to authenticated;
grant select, update on public.orders to authenticated;
grant insert (visitor_id, event_type, product_id)
  on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;

create policy "profile owner or admin can read"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id or (select private.is_admin()));

create policy "public can read active categories"
on public.categories
for select
to anon
using (active);

create policy "authenticated can read active categories or admin catalog"
on public.categories
for select
to authenticated
using (active or (select private.is_admin()));

create policy "admins can insert categories"
on public.categories
for insert
to authenticated
with check ((select private.is_admin()));

create policy "admins can update categories"
on public.categories
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "public can read active products"
on public.products
for select
to anon
using (active);

create policy "authenticated can read active products or admin catalog"
on public.products
for select
to authenticated
using (active or (select private.is_admin()));

create policy "admins can insert products"
on public.products
for insert
to authenticated
with check ((select private.is_admin()));

create policy "admins can update products"
on public.products
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "public can read store settings"
on public.store_settings
for select
to anon, authenticated
using (true);

create policy "admins can insert store settings"
on public.store_settings
for insert
to authenticated
with check ((select private.is_admin()));

create policy "admins can update store settings"
on public.store_settings
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "public can create pending orders"
on public.orders
for insert
to anon, authenticated
with check (
  status = 'pending'
  and delivery_fee = 0
  and total = subtotal
);

create policy "admins can read orders"
on public.orders
for select
to authenticated
using ((select private.is_admin()));

create policy "admins can update orders"
on public.orders
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "visitors can record analytics"
on public.analytics_events
for insert
to anon, authenticated
with check (
  (event_type = 'site_visit' and product_id is null)
  or (event_type = 'product_view' and product_id is not null)
);

create policy "admins can read analytics"
on public.analytics_events
for select
to authenticated
using ((select private.is_admin()));

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

create policy "admins can upload product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (select private.is_admin())
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "admins can update product images"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images' and (select private.is_admin()))
with check (
  bucket_id = 'product-images'
  and (select private.is_admin())
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "admins can delete product images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images' and (select private.is_admin()));

insert into public.store_settings (
  id,
  store_name,
  city,
  delivery_message,
  pickup_address
)
values (
  1,
  'Joedla Collection',
  'Rosário do Catete',
  'Entrega grátis em Rosário do Catete',
  'Endereço de retirada a combinar'
)
on conflict (id) do nothing;

insert into public.categories (slug, name, image_url, sort_order)
values
  (
    'fitness',
    'Fitness',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=85',
    10
  ),
  (
    'casual',
    'Moda Casual',
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=85',
    20
  ),
  (
    'bolsas',
    'Bolsas',
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=85',
    30
  ),
  (
    'infantil',
    'Infantil',
    'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?auto=format&fit=crop&w=600&q=85',
    40
  )
on conflict (slug) do nothing;
