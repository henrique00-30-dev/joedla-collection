-- Persistência visual do selo promocional individual.
-- Compatível com promoções existentes: aplica valores padrão.

alter table public.product_promotions
  add column if not exists badge_position text not null default 'top-left',
  add column if not exists badge_size text not null default 'medium',
  add column if not exists badge_shape text not null default 'pill';

alter table public.product_promotions
  drop constraint if exists product_promotions_badge_position_check,
  drop constraint if exists product_promotions_badge_size_check,
  drop constraint if exists product_promotions_badge_shape_check;

alter table public.product_promotions
  add constraint product_promotions_badge_position_check
    check (badge_position in (
      'top-left', 'top-right', 'bottom-left', 'bottom-right'
    )),
  add constraint product_promotions_badge_size_check
    check (badge_size in ('small', 'medium', 'large')),
  add constraint product_promotions_badge_shape_check
    check (badge_shape in ('pill', 'rounded', 'square'));

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
  requested_badge_position text;
  requested_badge_size text;
  requested_badge_shape text;
begin
  if not private.is_admin() then
    raise exception 'Acesso administrativo necessario';
  end if;

  if requested_product_id is null
    or jsonb_typeof(promotion_payload) <> 'object' then
    raise exception 'Promocao individual invalida';
  end if;

  select * into product_row
  from public.products
  where id = requested_product_id and active
  for update;

  if product_row.id is null then
    raise exception 'Produto nao encontrado';
  end if;

  select * into current_promotion
  from public.product_promotions
  where product_id = requested_product_id
  for update;

  if current_promotion.id is not null
    and current_promotion.version is distinct from expected_version then
    raise exception 'Promocao alterada em outra sessao';
  end if;

  if current_promotion.id is null and expected_version is not null then
    raise exception 'Promocao alterada em outra sessao';
  end if;

  requested_price_cents :=
    nullif(promotion_payload ->> 'promotional_price_cents', '')::bigint;
  starts_at :=
    nullif(promotion_payload ->> 'start_at', '')::timestamptz;
  ends_at :=
    nullif(promotion_payload ->> 'end_at', '')::timestamptz;
  label :=
    btrim(coalesce(
      nullif(promotion_payload ->> 'badge_label', ''),
      'Promoção'
    ));

  requested_badge_position :=
    coalesce(
      nullif(promotion_payload ->> 'badge_position', ''),
      'top-left'
    );
  requested_badge_size :=
    coalesce(
      nullif(promotion_payload ->> 'badge_size', ''),
      'medium'
    );
  requested_badge_shape :=
    coalesce(
      nullif(promotion_payload ->> 'badge_shape', ''),
      'pill'
    );

  if requested_price_cents is null or requested_price_cents <= 0 then
    raise exception 'Preco promocional deve ser maior que zero';
  end if;

  if requested_price_cents >= round(product_row.price * 100)::bigint then
    raise exception 'Preco promocional deve ser menor que o preco normal';
  end if;

  if ends_at is not null
    and starts_at is not null
    and ends_at <= starts_at then
    raise exception 'Termino deve ser posterior ao inicio';
  end if;

  if char_length(label) < 1
    or char_length(label) > 24
    or label ~* '<|>|javascript[[:space:]]*:|on[a-z]+[[:space:]]*=' then
    raise exception 'Texto do selo invalido';
  end if;

  if coalesce(promotion_payload ->> 'badge_tone', 'wine') not in (
    'wine', 'caramel', 'dark', 'success', 'attention'
  ) then
    raise exception 'Cor do selo invalida';
  end if;

  if requested_badge_position not in (
    'top-left', 'top-right', 'bottom-left', 'bottom-right'
  ) then
    raise exception 'Posicao do selo invalida';
  end if;

  if requested_badge_size not in ('small', 'medium', 'large') then
    raise exception 'Tamanho do selo invalido';
  end if;

  if requested_badge_shape not in ('pill', 'rounded', 'square') then
    raise exception 'Formato do selo invalido';
  end if;

  insert into public.product_promotions(
    product_id,
    enabled,
    promotional_price_cents,
    start_at,
    end_at,
    show_badge,
    badge_label,
    badge_tone,
    badge_position,
    badge_size,
    badge_shape
  ) values (
    requested_product_id,
    coalesce((promotion_payload ->> 'enabled')::boolean, false),
    requested_price_cents,
    starts_at,
    ends_at,
    coalesce((promotion_payload ->> 'show_badge')::boolean, true),
    label,
    coalesce(promotion_payload ->> 'badge_tone', 'wine'),
    requested_badge_position,
    requested_badge_size,
    requested_badge_shape
  )
  on conflict (product_id) do update set
    enabled = excluded.enabled,
    promotional_price_cents = excluded.promotional_price_cents,
    start_at = excluded.start_at,
    end_at = excluded.end_at,
    show_badge = excluded.show_badge,
    badge_label = excluded.badge_label,
    badge_tone = excluded.badge_tone,
    badge_position = excluded.badge_position,
    badge_size = excluded.badge_size,
    badge_shape = excluded.badge_shape
  returning * into saved;

  return saved;
end;
$$;

revoke all on function public.admin_upsert_product_promotion(
  uuid, integer, jsonb
) from public;

grant execute on function public.admin_upsert_product_promotion(
  uuid, integer, jsonb
) to authenticated;
