alter table public.products
  add column if not exists photo_quality text not null default 'acceptable',
  add column if not exists photo_provisional boolean not null default false;

alter table public.products
  drop constraint if exists products_photo_quality_check;
alter table public.products
  add constraint products_photo_quality_check
  check (photo_quality in ('recommended', 'acceptable', 'reduced'));

create index if not exists products_provisional_photo_idx
  on public.products (created_at desc)
  where active and photo_provisional;

alter table public.store_settings
  add column if not exists banner_title text not null default 'Elegância para todos os momentos',
  add column if not exists banner_subtitle text not null default 'Novidades selecionadas para renovar seu estilo com leveza.',
  add column if not exists banner_button_label text not null default 'Conhecer coleção',
  add column if not exists banner_image_url text not null default 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=85',
  add column if not exists banner_link text not null default '/(tabs)/categories',
  add column if not exists banner_start_at date,
  add column if not exists banner_end_at date;

alter table public.store_settings
  drop constraint if exists store_settings_banner_dates_check;
alter table public.store_settings
  add constraint store_settings_banner_dates_check
  check (banner_start_at is null or banner_end_at is null or banner_start_at <= banner_end_at);

alter table public.orders
  add column if not exists customer_id uuid references auth.users (id) on delete set null;

create index if not exists orders_customer_created_idx
  on public.orders (customer_id, created_at desc)
  where customer_id is not null;

drop policy if exists "public can create pending orders" on public.orders;
create policy "public can create pending orders"
on public.orders
for insert
to anon, authenticated
with check (
  status = 'pending'
  and delivery_fee = 0
  and total = subtotal
  and (customer_id is null or customer_id = (select auth.uid()))
);

drop policy if exists "customers can read own orders" on public.orders;
create policy "customers can read own orders"
on public.orders
for select
to authenticated
using (customer_id = (select auth.uid()));
