-- Migração segura para instalações existentes da Joedla Collection.
-- Adiciona categorias administráveis sem apagar produtos.

begin;

create table if not exists public.categories (
  slug text primary key check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 80),
  image_url text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists categories_normalized_name_unique
  on public.categories (lower(btrim(name)));

create index if not exists categories_active_sort_idx
  on public.categories (sort_order, name)
  where active;

insert into public.categories (slug, name, image_url, sort_order)
values
  ('fitness', 'Fitness', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=85', 10),
  ('casual', 'Moda Casual', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=85', 20),
  ('bolsas', 'Bolsas', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=85', 30),
  ('infantil', 'Infantil', 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?auto=format&fit=crop&w=600&q=85', 40)
on conflict (slug) do update set
  name = excluded.name,
  image_url = case
    when public.categories.image_url = '' then excluded.image_url
    else public.categories.image_url
  end;

insert into public.categories (slug, name, sort_order)
select distinct
  product.category,
  initcap(replace(product.category, '-', ' ')),
  100
from public.products as product
where not exists (
  select 1
  from public.categories as category
  where category.slug = product.category
)
on conflict (slug) do nothing;

alter table public.products drop constraint if exists products_category_check;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.products'::regclass
      and contype = 'f'
      and conname = 'products_category_fkey'
  ) then
    alter table public.products
      add constraint products_category_fkey
      foreign key (category) references public.categories (slug);
  end if;
end;
$$;

alter table public.categories enable row level security;

revoke all on public.categories from public;
grant select on public.categories to anon, authenticated;
grant insert, update on public.categories to authenticated;

drop policy if exists "public can read active categories" on public.categories;
create policy "public can read active categories"
on public.categories
for select
to anon
using (active);

drop policy if exists "authenticated can read active categories or admin catalog" on public.categories;
create policy "authenticated can read active categories or admin catalog"
on public.categories
for select
to authenticated
using (active or (select private.is_admin()));

drop policy if exists "admins can insert categories" on public.categories;
create policy "admins can insert categories"
on public.categories
for insert
to authenticated
with check ((select private.is_admin()));

drop policy if exists "admins can update categories" on public.categories;
create policy "admins can update categories"
on public.categories
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

commit;
