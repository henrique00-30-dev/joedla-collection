alter table public.profiles
  add column if not exists whatsapp text,
  add column if not exists birth_date date,
  add column if not exists marketing_consent boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Principal', recipient_name text not null, phone text, cep text,
  street text not null, number text not null, complement text, neighborhood text not null,
  city text not null, state text not null, reference text, is_default boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.customer_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, product_id)
);
create table if not exists public.recently_viewed_products (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  viewed_at timestamptz not null default now(), primary key (user_id, product_id)
);
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  rating integer not null check (rating between 1 and 5), title text,
  comment text not null check (char_length(comment) between 3 and 1200), display_name text not null,
  verified_purchase boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  moderation_note text, moderated_at timestamptz, moderated_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);
create index if not exists product_reviews_product_status_idx on public.product_reviews(product_id, status, created_at desc);

create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(), review_id uuid not null references public.product_reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now(), resolved_at timestamptz, resolved_by uuid references auth.users(id),
  unique (review_id, user_id)
);
create table if not exists public.product_questions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  question text not null check (char_length(question) between 3 and 800), display_name text not null,
  answer text, status text not null default 'pending' check (status in ('pending','published','rejected')),
  answered_at timestamptz, answered_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists product_questions_product_status_idx on public.product_questions(product_id, status, created_at desc);

create table if not exists public.stock_notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(), notified_at timestamptz, active boolean not null default true,
  unique (user_id, product_id)
);
create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, title text not null, message text not null, payload jsonb not null default '{}'::jsonb,
  read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists customer_notifications_user_created_idx on public.customer_notifications(user_id, created_at desc);
create table if not exists public.marketing_consent_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  consented boolean not null, source text not null default 'account', created_at timestamptz not null default now()
);
create table if not exists public.loyalty_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points integer not null default 0 check (points >= 0), lifetime_points integer not null default 0 check (lifetime_points >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  points integer not null, type text not null check (type in ('earn','redeem','adjustment','expire')),
  description text not null, source_order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists loyalty_earn_order_once_idx on public.loyalty_transactions(source_order_id)
  where source_order_id is not null and type = 'earn';
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(), code text not null unique, description text,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  min_order_value numeric(12,2) not null default 0 check (min_order_value >= 0),
  starts_at timestamptz, ends_at timestamptz, active boolean not null default true,
  max_uses integer, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.customer_coupons (
  user_id uuid not null references auth.users(id) on delete cascade,
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  assigned_at timestamptz not null default now(), used_at timestamptz,
  primary key (user_id, coupon_id)
);

create or replace function private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
create or replace function private.review_verified_purchase(p_user_id uuid, p_product_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.orders o, lateral jsonb_array_elements(o.items) item
    where o.customer_id = p_user_id and o.status <> 'cancelled' and item ->> 'productId' = p_product_id::text
  );
$$;
revoke all on function private.review_verified_purchase(uuid, uuid) from public, anon, authenticated;

create or replace function private.prepare_review() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.user_id := auth.uid();
  select coalesce(nullif(trim(p.full_name), ''), 'Cliente') into new.display_name from public.profiles p where p.id = new.user_id;
  new.display_name := coalesce(new.display_name, 'Cliente');
  new.verified_purchase := private.review_verified_purchase(new.user_id, new.product_id);
  new.status := 'pending'; new.moderation_note := null; new.moderated_at := null; new.moderated_by := null;
  return new;
end; $$;
revoke all on function private.prepare_review() from public, anon, authenticated;

drop trigger if exists product_reviews_touch_updated_at on public.product_reviews;
create trigger product_reviews_touch_updated_at before update on public.product_reviews for each row execute function private.touch_updated_at();
drop trigger if exists prepare_product_review on public.product_reviews;
create trigger prepare_product_review before insert on public.product_reviews for each row execute function private.prepare_review();

create or replace function private.prepare_question() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.user_id := auth.uid();
  select coalesce(nullif(trim(p.full_name), ''), 'Cliente') into new.display_name from public.profiles p where p.id = new.user_id;
  new.display_name := coalesce(new.display_name, 'Cliente');
  new.status := 'pending'; new.answer := null; new.answered_at := null; new.answered_by := null;
  return new;
end; $$;
revoke all on function private.prepare_question() from public, anon, authenticated;
drop trigger if exists product_questions_touch_updated_at on public.product_questions;
create trigger product_questions_touch_updated_at before update on public.product_questions for each row execute function private.touch_updated_at();
drop trigger if exists prepare_product_question on public.product_questions;
create trigger prepare_product_question before insert on public.product_questions for each row execute function private.prepare_question();
drop trigger if exists customer_addresses_touch_updated_at on public.customer_addresses;
create trigger customer_addresses_touch_updated_at before update on public.customer_addresses for each row execute function private.touch_updated_at();

create or replace function private.award_loyalty_on_order_complete() returns trigger language plpgsql security definer set search_path = '' as $$
declare earned integer;
begin
  if new.customer_id is not null and new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    earned := greatest(floor(new.total)::integer, 0);
    if earned > 0 then
      insert into public.loyalty_transactions(user_id, points, type, description, source_order_id)
      values (new.customer_id, earned, 'earn', 'Pontos da compra ' || new.public_code, new.id) on conflict do nothing;
      if found then
        insert into public.loyalty_accounts(user_id, points, lifetime_points) values (new.customer_id, earned, earned)
        on conflict (user_id) do update set points = public.loyalty_accounts.points + excluded.points,
          lifetime_points = public.loyalty_accounts.lifetime_points + excluded.lifetime_points, updated_at = now();
        insert into public.customer_notifications(user_id, type, title, message, payload)
        values (new.customer_id, 'loyalty', 'Você ganhou pontos', 'Sua compra rendeu ' || earned || ' ponto(s).',
          jsonb_build_object('orderId', new.id, 'points', earned));
      end if;
    end if;
  end if; return new;
end; $$;
revoke all on function private.award_loyalty_on_order_complete() from public, anon, authenticated;
drop trigger if exists award_loyalty_after_order_complete on public.orders;
create trigger award_loyalty_after_order_complete after insert or update of status on public.orders
for each row execute function private.award_loyalty_on_order_complete();

create or replace function private.notify_stock_return() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(old.stock, 0) <= 0 and coalesce(new.stock, 0) > 0 then
    insert into public.customer_notifications(user_id, type, title, message, payload)
    select s.user_id, 'stock', 'Produto disponível novamente', new.name || ' voltou ao estoque.', jsonb_build_object('productId', new.id)
    from public.stock_notifications s where s.product_id = new.id and s.active = true and s.notified_at is null;
    update public.stock_notifications set notified_at = now(), active = false
    where product_id = new.id and active = true and notified_at is null;
  end if; return new;
end; $$;
revoke all on function private.notify_stock_return() from public, anon, authenticated;
drop trigger if exists notify_stock_return_after_product_update on public.products;
create trigger notify_stock_return_after_product_update after update of stock on public.products
for each row execute function private.notify_stock_return();

alter table public.customer_addresses enable row level security;
alter table public.customer_favorites enable row level security;
alter table public.recently_viewed_products enable row level security;
alter table public.product_reviews enable row level security;
alter table public.review_reports enable row level security;
alter table public.product_questions enable row level security;
alter table public.stock_notifications enable row level security;
alter table public.customer_notifications enable row level security;
alter table public.marketing_consent_events enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.coupons enable row level security;
alter table public.customer_coupons enable row level security;

grant select, insert, update, delete on public.customer_addresses to authenticated;
grant select, insert, delete on public.customer_favorites to authenticated;
grant select, insert, update, delete on public.recently_viewed_products to authenticated;
grant select, insert, update on public.product_reviews to authenticated;
grant select on public.product_reviews to anon;
grant select, insert on public.review_reports to authenticated;
grant select, insert, update on public.product_questions to authenticated;
grant select on public.product_questions to anon;
grant select, insert, update, delete on public.stock_notifications to authenticated;
grant select, update on public.customer_notifications to authenticated;
grant select, insert on public.marketing_consent_events to authenticated;
grant select on public.loyalty_accounts, public.loyalty_transactions, public.customer_coupons, public.coupons to authenticated;

create policy "customers manage own addresses" on public.customer_addresses for all to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin())) with check ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "customers manage own favorites" on public.customer_favorites for all to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin())) with check ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "customers manage own recently viewed" on public.recently_viewed_products for all to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin())) with check ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "public reads approved reviews" on public.product_reviews for select to anon, authenticated
using (status = 'approved' or (select auth.uid()) = user_id or (select private.is_admin()));
create policy "customers create own reviews" on public.product_reviews for insert to authenticated
with check ((select auth.uid()) = user_id and status = 'pending');
create policy "customers edit pending own reviews" on public.product_reviews for update to authenticated
using (((select auth.uid()) = user_id and status = 'pending') or (select private.is_admin()))
with check (((select auth.uid()) = user_id and status = 'pending') or (select private.is_admin()));
create policy "customers create and read own review reports" on public.review_reports for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "customers create review reports" on public.review_reports for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "public reads published questions" on public.product_questions for select to anon, authenticated
using (status = 'published' or (select auth.uid()) = user_id or (select private.is_admin()));
create policy "customers create questions" on public.product_questions for insert to authenticated
with check ((select auth.uid()) = user_id and status = 'pending');
create policy "admins moderate questions" on public.product_questions for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "customers manage own stock notifications" on public.stock_notifications for all to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin())) with check ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "customers read own notifications" on public.customer_notifications for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "customers mark own notifications read" on public.customer_notifications for update to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin())) with check ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "customers read own consent history" on public.marketing_consent_events for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "customers record own consent" on public.marketing_consent_events for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "customers read own loyalty account" on public.loyalty_accounts for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "customers read own loyalty transactions" on public.loyalty_transactions for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "customers read assigned coupons" on public.customer_coupons for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "authenticated read active coupons" on public.coupons for select to authenticated
using ((active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())) or (select private.is_admin()));
