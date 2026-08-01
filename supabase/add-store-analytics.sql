-- Métricas anônimas de acesso, visualizações e produtos comprados.

begin;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  event_type text not null check (event_type in ('site_visit', 'product_view')),
  product_id uuid references public.products (id) on delete set null,
  visit_date date not null default ((now() at time zone 'utc')::date),
  created_at timestamptz not null default now(),
  check (
    (event_type = 'site_visit' and product_id is null)
    or (event_type = 'product_view' and product_id is not null)
  )
);

create unique index if not exists analytics_one_visit_per_day_idx
  on public.analytics_events (visitor_id, visit_date)
  where event_type = 'site_visit';

create unique index if not exists analytics_one_product_view_per_day_idx
  on public.analytics_events (visitor_id, product_id, visit_date)
  where event_type = 'product_view';

create index if not exists analytics_events_created_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_product_views_idx
  on public.analytics_events (product_id, created_at desc)
  where event_type = 'product_view';

alter table public.analytics_events enable row level security;

revoke all on public.analytics_events from public;
grant insert (visitor_id, event_type, product_id)
  on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;

drop policy if exists "visitors can record analytics" on public.analytics_events;
create policy "visitors can record analytics"
on public.analytics_events
for insert
to anon, authenticated
with check (
  (event_type = 'site_visit' and product_id is null)
  or (event_type = 'product_view' and product_id is not null)
);

drop policy if exists "admins can read analytics" on public.analytics_events;
create policy "admins can read analytics"
on public.analytics_events
for select
to authenticated
using ((select private.is_admin()));

create or replace function public.record_analytics_event(
  event_visitor_id uuid,
  event_kind text,
  event_product_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if event_kind not in ('site_visit', 'product_view') then
    raise exception 'Tipo de evento inválido';
  end if;

  if event_kind = 'site_visit' and event_product_id is not null then
    raise exception 'Acesso geral não aceita produto';
  end if;

  if event_kind = 'product_view' and event_product_id is null then
    raise exception 'Visualização exige produto';
  end if;

  insert into public.analytics_events (visitor_id, event_type, product_id)
  values (event_visitor_id, event_kind, event_product_id)
  on conflict do nothing;
end;
$$;

revoke all on function public.record_analytics_event(uuid, text, uuid) from public;
grant execute on function public.record_analytics_event(uuid, text, uuid) to anon, authenticated;

create or replace function public.admin_analytics_summary(period_days integer default 30)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  safe_days integer := least(greatest(coalesce(period_days, 30), 1), 3650);
begin
  if not private.is_admin() then
    raise exception 'Acesso administrativo necessário';
  end if;

  return (
    with period_events as (
      select event_type, visitor_id, product_id
      from public.analytics_events
      where created_at >= now() - make_interval(days => safe_days)
    ),
    viewed as (
      select
        event.product_id::text as product_id,
        coalesce(product.name, 'Produto removido') as product_name,
        count(*)::integer as metric_count
      from period_events as event
      left join public.products as product on product.id = event.product_id
      where event.event_type = 'product_view'
      group by event.product_id, product.name
      order by metric_count desc, product_name
      limit 10
    ),
    purchased as (
      select
        coalesce(item ->> 'productId', '') as product_id,
        coalesce(max(item ->> 'productName'), 'Produto') as product_name,
        sum(
          case
            when coalesce(item ->> 'quantity', '') ~ '^[0-9]+$'
              then (item ->> 'quantity')::integer
            else 0
          end
        )::integer as metric_count
      from public.orders as order_row
      cross join lateral jsonb_array_elements(order_row.items) as item
      where order_row.created_at >= now() - make_interval(days => safe_days)
        and order_row.status <> 'cancelled'
      group by coalesce(item ->> 'productId', '')
      order by metric_count desc, product_name
      limit 10
    )
    select jsonb_build_object(
      'periodDays', safe_days,
      'uniqueVisitors', (
        select count(distinct visitor_id)::integer from period_events
        where event_type = 'site_visit'
      ),
      'totalVisits', (
        select count(*)::integer from period_events where event_type = 'site_visit'
      ),
      'productViews', (
        select count(*)::integer from period_events where event_type = 'product_view'
      ),
      'orders', (
        select count(*)::integer
        from public.orders
        where created_at >= now() - make_interval(days => safe_days)
          and status <> 'cancelled'
      ),
      'topViewed', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'productId', product_id,
              'name', product_name,
              'count', metric_count
            )
            order by metric_count desc, product_name
          )
          from viewed
        ),
        '[]'::jsonb
      ),
      'topPurchased', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'productId', product_id,
              'name', product_name,
              'count', metric_count
            )
            order by metric_count desc, product_name
          )
          from purchased
        ),
        '[]'::jsonb
      )
    )
  );
end;
$$;

revoke all on function public.admin_analytics_summary(integer) from public;
grant execute on function public.admin_analytics_summary(integer) to authenticated;

commit;
