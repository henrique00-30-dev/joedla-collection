create extension if not exists pgcrypto;

create table if not exists public.customer_login_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  token_hash text,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used_at timestamptz null,
  delivery_provider text,
  delivery_id text,
  created_at timestamptz not null default now()
);

create index if not exists customer_login_codes_email_created_idx
  on public.customer_login_codes (email, created_at desc);

create index if not exists customer_login_codes_active_idx
  on public.customer_login_codes (email, expires_at desc)
  where used_at is null;

alter table public.customer_login_codes
  enable row level security;

revoke all
  on public.customer_login_codes
  from anon, authenticated;

grant all
  on public.customer_login_codes
  to service_role;
