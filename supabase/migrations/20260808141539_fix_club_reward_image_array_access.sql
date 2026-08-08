create or replace function public.club_customer_summary(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  cid uuid;
  c public.club_customers%rowtype;
begin
  select customer_id
    into cid
  from public.club_sessions
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and expires_at > now()
  order by created_at desc
  limit 1;

  if cid is null then
    raise exception 'Acesso expirado. Entre novamente.';
  end if;

  select * into c
  from public.club_customers
  where id = cid;

  return jsonb_build_object(
    'customer', jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'whatsapp', c.whatsapp
    ),
    'points', public.club_points_balance(cid),
    'orders', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'publicCode', o.public_code,
          'total', o.total,
          'createdAt', o.created_at,
          'paid', coalesce(p.paid, 0),
          'remaining', greatest(o.total - coalesce(p.paid, 0), 0)
        )
        order by o.created_at desc
      )
      from public.orders o
      left join (
        select order_id, sum(amount) paid
        from public.club_payments
        group by order_id
      ) p on p.order_id = o.id
      where public.club_normalize_phone(o.customer_whatsapp) = c.whatsapp
        and o.status = 'completed'
    ), '[]'::jsonb),
    'ledger', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', l.id,
          'points', l.points,
          'type', l.type,
          'description', l.description,
          'createdAt', l.created_at
        )
        order by l.created_at desc
      )
      from public.club_points_ledger l
      where l.customer_id = cid
    ), '[]'::jsonb),
    'rewards', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'productId', p.id,
          'name', p.name,
          'imageUrl', coalesce(p.image_urls[1], ''),
          'pointsRequired', r.points_required
        )
        order by r.points_required
      )
      from public.club_rewards r
      join public.products p on p.id = r.product_id
      where r.active
        and p.active
    ), '[]'::jsonb)
  );
end
$function$;
