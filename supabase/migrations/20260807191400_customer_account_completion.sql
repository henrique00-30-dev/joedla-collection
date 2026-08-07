create table if not exists public.customer_privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('data_export','account_deletion')),
  status text not null default 'pending' check (status in ('pending','processing','completed','rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_privacy_requests enable row level security;
grant select, insert on public.customer_privacy_requests to authenticated;

create policy "customers create privacy requests" on public.customer_privacy_requests
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "customers read own privacy requests" on public.customer_privacy_requests
for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));

create index if not exists customer_privacy_requests_user_created_idx
  on public.customer_privacy_requests(user_id, created_at desc);

create or replace function private.ensure_single_default_customer_address()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_default then
    update public.customer_addresses
      set is_default = false,
          updated_at = now()
    where user_id = new.user_id
      and id <> new.id
      and is_default = true;
  end if;
  return new;
end;
$$;

revoke all on function private.ensure_single_default_customer_address() from public, anon, authenticated;
drop trigger if exists ensure_single_default_customer_address on public.customer_addresses;
create trigger ensure_single_default_customer_address
after insert or update of is_default on public.customer_addresses
for each row execute function private.ensure_single_default_customer_address();
