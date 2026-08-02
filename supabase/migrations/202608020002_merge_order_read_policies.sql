drop policy if exists "admins can read orders" on public.orders;
drop policy if exists "customers can read own orders" on public.orders;

create policy "authenticated can read permitted orders"
on public.orders
for select
to authenticated
using (
  customer_id = (select auth.uid())
  or (select private.is_admin())
);
