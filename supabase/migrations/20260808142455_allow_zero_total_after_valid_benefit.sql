alter table public.orders
  drop constraint if exists orders_total_check;

alter table public.orders
  add constraint orders_total_check
  check (total >= 0);
