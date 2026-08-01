-- Correção segura para projetos que já executaram schema.sql.
-- Mantém o produto ativo mais recente de cada nome e arquiva somente as cópias.

begin;

with ranked_active_products as (
  select
    id,
    row_number() over (
      partition by lower(btrim(name))
      order by created_at desc, id desc
    ) as copy_number
  from public.products
  where active
)
update public.products as product
set active = false
from ranked_active_products as ranked
where product.id = ranked.id
  and ranked.copy_number > 1;

update public.products
set category = 'bolsas'
where active
  and category <> 'bolsas'
  and (
    lower(name) like '%bolsa%'
    or lower(name) like '%carteira%'
  );

create unique index if not exists products_active_normalized_name_unique
  on public.products (lower(btrim(name)))
  where active;

commit;
