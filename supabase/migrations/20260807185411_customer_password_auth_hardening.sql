create table if not exists public.customer_registration_attempts (
  id bigserial primary key,
  email_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.customer_registration_attempts enable row level security;
revoke all on public.customer_registration_attempts from anon, authenticated;

create index if not exists customer_registration_attempts_hash_created_idx
  on public.customer_registration_attempts(email_hash, created_at desc);

grant select on public.profiles to authenticated;
grant update (full_name, whatsapp, birth_date, marketing_consent, updated_at) on public.profiles to authenticated;

drop policy if exists "profile owner or admin can update customer fields" on public.profiles;
create policy "profile owner or admin can update customer fields" on public.profiles
for update to authenticated
using ((select auth.uid()) = id or (select private.is_admin()))
with check ((select auth.uid()) = id or (select private.is_admin()));

create or replace function private.cleanup_customer_registration_attempts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.customer_registration_attempts
  where created_at < now() - interval '24 hours';
  return new;
end;
$$;

drop trigger if exists cleanup_customer_registration_attempts on public.customer_registration_attempts;
create trigger cleanup_customer_registration_attempts
after insert on public.customer_registration_attempts
for each statement execute function private.cleanup_customer_registration_attempts();
