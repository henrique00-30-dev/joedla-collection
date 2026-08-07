create or replace function public.claim_order_for_current_customer(
  requested_order_id uuid,
  requested_lookup_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Autenticacao obrigatoria';
  end if;

  update public.orders
  set customer_id = current_user_id,
      updated_at = now()
  where id = requested_order_id
    and lookup_token = requested_lookup_token
    and (customer_id is null or customer_id = current_user_id);

  return found;
end;
$$;

revoke all on function public.claim_order_for_current_customer(uuid, uuid) from public, anon;
grant execute on function public.claim_order_for_current_customer(uuid, uuid) to authenticated;
