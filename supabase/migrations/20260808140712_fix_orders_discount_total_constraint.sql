alter table public.orders
  drop constraint if exists orders_check;

alter table public.orders
  add constraint orders_check
  check (
    total = greatest(
      (subtotal + delivery_fee) - coalesce(discount_amount, 0),
      0
    )
  );
