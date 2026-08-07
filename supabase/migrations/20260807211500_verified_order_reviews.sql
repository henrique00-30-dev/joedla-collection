alter table public.product_reviews
  alter column user_id drop not null;

alter table public.product_reviews
  add column if not exists order_id uuid references public.orders(id) on delete cascade;

create unique index if not exists product_reviews_order_product_key
  on public.product_reviews(order_id, product_id)
  where order_id is not null;

create or replace function public.submit_verified_order_review(
  p_lookup_token uuid,
  p_product_id uuid,
  p_rating integer,
  p_comment text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_review_id uuid;
  v_display_name text;
  v_trimmed_comment text;
  v_parts text[];
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'Avaliação deve ter entre 1 e 5 estrelas.' using errcode = '22023';
  end if;

  v_trimmed_comment := btrim(coalesce(p_comment, ''));
  if char_length(v_trimmed_comment) < 3 then
    raise exception 'Escreva um comentário com pelo menos 3 caracteres.' using errcode = '22023';
  end if;
  if char_length(v_trimmed_comment) > 1200 then
    raise exception 'Comentário muito longo.' using errcode = '22023';
  end if;

  select * into v_order
  from public.orders
  where lookup_token = p_lookup_token
  limit 1;

  if not found then
    raise exception 'Pedido não encontrado ou acesso inválido.' using errcode = 'P0002';
  end if;

  if v_order.status <> 'completed' then
    raise exception 'A avaliação fica disponível somente após a conclusão do pedido.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(v_order.items) item
    where (item->>'productId')::uuid = p_product_id
  ) then
    raise exception 'Este produto não pertence ao pedido informado.' using errcode = '22023';
  end if;

  v_parts := regexp_split_to_array(btrim(v_order.customer_name), '\s+');
  v_display_name := coalesce(v_parts[1], 'Cliente');
  if array_length(v_parts, 1) > 1 then
    v_display_name := v_display_name || ' ' || left(v_parts[array_length(v_parts, 1)], 1) || '.';
  end if;

  insert into public.product_reviews (
    user_id,
    order_id,
    product_id,
    rating,
    comment,
    display_name,
    verified_purchase,
    status
  ) values (
    null,
    v_order.id,
    p_product_id,
    p_rating,
    v_trimmed_comment,
    v_display_name,
    true,
    'pending'
  )
  returning id into v_review_id;

  return v_review_id;
exception
  when unique_violation then
    raise exception 'Este produto já foi avaliado neste pedido.' using errcode = '23505';
end;
$$;

revoke all on function public.submit_verified_order_review(uuid, uuid, integer, text) from public;
grant execute on function public.submit_verified_order_review(uuid, uuid, integer, text) to anon, authenticated;

create or replace function public.get_verified_order_reviewed_products(p_lookup_token uuid)
returns table(product_id uuid)
language sql
security definer
set search_path = public, pg_temp
as $$
  select pr.product_id
  from public.product_reviews pr
  join public.orders o on o.id = pr.order_id
  where o.lookup_token = p_lookup_token
    and pr.order_id is not null;
$$;

revoke all on function public.get_verified_order_reviewed_products(uuid) from public;
grant execute on function public.get_verified_order_reviewed_products(uuid) to anon, authenticated;
