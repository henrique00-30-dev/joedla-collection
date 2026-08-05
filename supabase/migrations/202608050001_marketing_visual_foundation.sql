-- Tarefa 1, Bloco 1: fundacao segura das campanhas visuais (Versao 1A).
-- Este arquivo nao altera precos, pedidos, estoque ou o banner legado.
-- O modulo nasce desativado e so sera ligado depois da homologacao.

create table public.marketing_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  store_timezone text not null default 'America/Maceio'
    check (store_timezone = 'America/Maceio'),
  max_image_bytes bigint not null default 5242880
    check (max_image_bytes between 1048576 and 20971520),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 3 and 120),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'paused', 'archived')),
  start_at timestamptz,
  end_at timestamptz,
  priority integer not null default 0 check (priority between -1000 and 1000),
  version integer not null default 1 check (version >= 1),
  published_at timestamptz,
  paused_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at is null or start_at is null or start_at < end_at),
  check (status <> 'published' or start_at is not null)
);

create index marketing_campaigns_status_period_idx
  on public.marketing_campaigns (status, start_at, end_at);

create index marketing_campaigns_active_priority_idx
  on public.marketing_campaigns (priority desc, start_at desc)
  where status = 'published';

create table public.marketing_campaign_targets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null
    references public.marketing_campaigns (id) on delete cascade,
  target_type text not null
    check (target_type in ('store', 'category', 'product')),
  product_id uuid references public.products (id) on delete restrict,
  category_slug text references public.categories (slug) on delete restrict,
  include_new_products boolean not null default false,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (
      target_type = 'store'
      and product_id is null
      and category_slug is null
      and not include_new_products
    )
    or (
      target_type = 'category'
      and product_id is null
      and category_slug is not null
    )
    or (
      target_type = 'product'
      and product_id is not null
      and category_slug is null
      and not include_new_products
    )
  )
);

create unique index marketing_targets_one_store_idx
  on public.marketing_campaign_targets (campaign_id)
  where target_type = 'store';

create unique index marketing_targets_one_product_idx
  on public.marketing_campaign_targets (campaign_id, product_id)
  where target_type = 'product';

create unique index marketing_targets_one_category_idx
  on public.marketing_campaign_targets (campaign_id, category_slug)
  where target_type = 'category';

create index marketing_targets_product_idx
  on public.marketing_campaign_targets (product_id)
  where product_id is not null;

create index marketing_targets_category_idx
  on public.marketing_campaign_targets (category_slug)
  where category_slug is not null;

create table public.marketing_campaign_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null
    references public.marketing_campaigns (id) on delete cascade,
  storage_path text not null unique
    check (char_length(btrim(storage_path)) between 5 and 500),
  format text not null check (format in ('desktop', 'mobile')),
  mime_type text not null
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size bigint not null check (byte_size between 1 and 20971520),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  alt_text text not null check (char_length(btrim(alt_text)) between 1 and 160),
  focal_x numeric(5, 4) not null default 0.5
    check (focal_x between 0 and 1),
  focal_y numeric(5, 4) not null default 0.5
    check (focal_y between 0 and 1),
  zoom numeric(5, 2) not null default 1
    check (zoom between 1 and 3),
  lifecycle_status text not null default 'active'
    check (lifecycle_status in ('active', 'pending_deletion')),
  recover_after timestamptz,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    lifecycle_status <> 'pending_deletion'
    or recover_after is not null
  ),
  unique (campaign_id, id)
);

create index marketing_assets_cleanup_idx
  on public.marketing_campaign_assets (recover_after)
  where lifecycle_status = 'pending_deletion';

create table public.marketing_campaign_placements (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null
    references public.marketing_campaigns (id) on delete cascade,
  position text not null
    check (
      position in (
        'home_hero',
        'home_secondary_1',
        'home_secondary_2',
        'home_secondary_3'
      )
    ),
  title text not null default '' check (char_length(title) <= 120),
  subtitle text not null default '' check (char_length(subtitle) <= 240),
  button_label text not null default '' check (char_length(button_label) <= 40),
  desktop_asset_id uuid,
  mobile_asset_id uuid,
  destination_type text not null default 'none'
    check (
      destination_type in (
        'none',
        'product',
        'category',
        'campaign_products',
        'search',
        'whatsapp',
        'external'
      )
    ),
  destination_product_id uuid references public.products (id) on delete restrict,
  destination_category_slug text
    references public.categories (slug) on delete restrict,
  destination_search text,
  destination_url text,
  sort_order integer not null default 0 check (sort_order between 0 and 100),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, position),
  foreign key (campaign_id, desktop_asset_id)
    references public.marketing_campaign_assets (campaign_id, id)
    on delete restrict,
  foreign key (campaign_id, mobile_asset_id)
    references public.marketing_campaign_assets (campaign_id, id)
    on delete restrict,
  check (
    (destination_type = 'none'
      and destination_product_id is null
      and destination_category_slug is null
      and destination_search is null
      and destination_url is null)
    or (destination_type = 'product'
      and destination_product_id is not null
      and destination_category_slug is null
      and destination_search is null
      and destination_url is null)
    or (destination_type = 'category'
      and destination_product_id is null
      and destination_category_slug is not null
      and destination_search is null
      and destination_url is null)
    or (destination_type = 'search'
      and destination_product_id is null
      and destination_category_slug is null
      and char_length(btrim(destination_search)) between 1 and 120
      and destination_url is null)
    or (destination_type = 'external'
      and destination_product_id is null
      and destination_category_slug is null
      and destination_search is null
      and destination_url ~ '^https://[[:alnum:]][^[:space:]<>]*$')
    or (destination_type in ('campaign_products', 'whatsapp')
      and destination_product_id is null
      and destination_category_slug is null
      and destination_search is null
      and destination_url is null)
  ),
  check (
    destination_type = 'none'
    or char_length(btrim(button_label)) between 1 and 40
  )
);

create index marketing_placements_position_idx
  on public.marketing_campaign_placements (position, sort_order);

create table public.marketing_campaign_badges (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null unique
    references public.marketing_campaigns (id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 24),
  tone text not null
    check (tone in ('wine', 'caramel', 'dark', 'success', 'attention')),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.marketing_audit_log (
  id bigint generated always as identity primary key,
  entity_type text not null
    check (
      entity_type in (
        'campaign',
        'settings',
        'target',
        'asset',
        'placement',
        'badge'
      )
    ),
  entity_id text not null,
  campaign_id uuid
    references public.marketing_campaigns (id) on delete restrict,
  action text not null
    check (
      action in (
        'created',
        'updated',
        'published',
        'paused',
        'archived',
        'deleted',
        'settings_updated'
      )
    ),
  actor_id uuid references auth.users (id) on delete set null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index marketing_audit_campaign_created_idx
  on public.marketing_audit_log (campaign_id, created_at desc)
  where campaign_id is not null;

create or replace function public.marketing_campaign_situation(
  stored_status text,
  starts_at timestamptz,
  ends_at timestamptz,
  effective_at timestamptz default now()
)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when stored_status = 'draft' then 'draft'
    when stored_status = 'paused' then 'paused'
    when stored_status = 'archived' then 'archived'
    when stored_status <> 'published' then 'invalid'
    when starts_at is null then 'invalid'
    when effective_at < starts_at then 'scheduled'
    when ends_at is not null and effective_at >= ends_at then 'ended'
    else 'active'
  end;
$$;

revoke all on function public.marketing_campaign_situation(
  text,
  timestamptz,
  timestamptz,
  timestamptz
) from public;
grant execute on function public.marketing_campaign_situation(
  text,
  timestamptz,
  timestamptz,
  timestamptz
) to anon, authenticated;

create or replace function private.set_marketing_campaign_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'archived' then
    raise exception 'Campanha arquivada nao pode ser editada';
  end if;

  if old.status = 'draft'
    and new.status not in ('draft', 'published', 'archived') then
    raise exception 'Transicao de estado invalida';
  end if;

  if old.status = 'published'
    and new.status not in ('published', 'paused', 'archived') then
    raise exception 'Transicao de estado invalida';
  end if;

  if old.status = 'paused'
    and new.status not in ('paused', 'published', 'archived') then
    raise exception 'Transicao de estado invalida';
  end if;

  if new.status = 'published' and new.start_at is null then
    raise exception 'Campanha publicada exige data de inicio';
  end if;

  new.created_at := old.created_at;
  new.updated_at := now();
  new.version := old.version + 1;

  if new.status <> old.status then
    if new.status = 'published' then
      new.published_at := coalesce(old.published_at, now());
      new.paused_at := null;
    elsif new.status = 'paused' then
      new.paused_at := now();
    elsif new.status = 'archived' then
      new.archived_at := now();
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.set_marketing_campaign_updated_at() from public;

create or replace function private.set_marketing_settings_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.created_at := old.created_at;
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end;
$$;

revoke all on function private.set_marketing_settings_updated_at() from public;

create or replace function private.set_marketing_child_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.created_at := old.created_at;
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end;
$$;

revoke all on function private.set_marketing_child_updated_at() from public;

create or replace function private.enforce_marketing_target_scope()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.target_type = 'store' and exists (
    select 1
    from public.marketing_campaign_targets as target
    where target.campaign_id = new.campaign_id
      and target.id <> new.id
  ) then
    raise exception 'Campanha de toda a loja nao pode ter outros alvos';
  end if;

  if new.target_type <> 'store' and exists (
    select 1
    from public.marketing_campaign_targets as target
    where target.campaign_id = new.campaign_id
      and target.target_type = 'store'
      and target.id <> new.id
  ) then
    raise exception 'Campanha com alvo de toda a loja nao aceita outros alvos';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_marketing_target_scope() from public;

create or replace function private.record_marketing_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  audit_action text;
  audit_campaign_id uuid;
  audit_entity_id text;
begin
  if not private.is_admin() then
    raise exception 'Acesso administrativo necessario';
  end if;

  if tg_table_name = 'marketing_campaigns' then
    audit_campaign_id := case
      when tg_op = 'INSERT' then new.id
      else old.id
    end;
    audit_entity_id := audit_campaign_id::text;

    if tg_op = 'INSERT' then
      audit_action := 'created';
    elsif new.status is distinct from old.status then
      audit_action := case new.status
        when 'published' then 'published'
        when 'paused' then 'paused'
        when 'archived' then 'archived'
        else 'updated'
      end;
    else
      audit_action := 'updated';
    end if;

    insert into public.marketing_audit_log (
      entity_type,
      entity_id,
      campaign_id,
      action,
      actor_id,
      before_data,
      after_data
    )
    values (
      'campaign',
      audit_entity_id,
      audit_campaign_id,
      audit_action,
      auth.uid(),
      case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
      to_jsonb(new)
    );
  elsif tg_table_name = 'marketing_settings' then
    insert into public.marketing_audit_log (
      entity_type,
      entity_id,
      action,
      actor_id,
      before_data,
      after_data
    )
    values (
      'settings',
      new.id::text,
      'settings_updated',
      auth.uid(),
      to_jsonb(old),
      to_jsonb(new)
    );
  else
    if tg_op = 'INSERT' then
      audit_campaign_id := new.campaign_id;
      audit_entity_id := new.id::text;
      audit_action := 'created';
    else
      audit_campaign_id := old.campaign_id;
      audit_entity_id := old.id::text;
      audit_action := case when tg_op = 'DELETE' then 'deleted' else 'updated' end;
    end if;

    insert into public.marketing_audit_log (
      entity_type,
      entity_id,
      campaign_id,
      action,
      actor_id,
      before_data,
      after_data
    )
    values (
      case tg_table_name
        when 'marketing_campaign_targets' then 'target'
        when 'marketing_campaign_assets' then 'asset'
        when 'marketing_campaign_placements' then 'placement'
        when 'marketing_campaign_badges' then 'badge'
      end,
      audit_entity_id,
      audit_campaign_id,
      audit_action,
      auth.uid(),
      case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
      case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.record_marketing_audit() from public;

insert into public.marketing_settings (id, enabled)
values (1, false)
on conflict (id) do nothing;

create trigger marketing_campaigns_set_updated_at
before update on public.marketing_campaigns
for each row execute function private.set_marketing_campaign_updated_at();

create trigger marketing_settings_set_updated_at
before update on public.marketing_settings
for each row execute function private.set_marketing_settings_updated_at();

create trigger marketing_targets_set_updated_at
before update on public.marketing_campaign_targets
for each row execute function private.set_marketing_child_updated_at();

create trigger marketing_assets_set_updated_at
before update on public.marketing_campaign_assets
for each row execute function private.set_marketing_child_updated_at();

create trigger marketing_placements_set_updated_at
before update on public.marketing_campaign_placements
for each row execute function private.set_marketing_child_updated_at();

create trigger marketing_badges_set_updated_at
before update on public.marketing_campaign_badges
for each row execute function private.set_marketing_child_updated_at();

create trigger marketing_targets_enforce_scope
before insert or update on public.marketing_campaign_targets
for each row execute function private.enforce_marketing_target_scope();

create trigger marketing_campaigns_audit
after insert or update on public.marketing_campaigns
for each row execute function private.record_marketing_audit();

create trigger marketing_settings_audit
after update on public.marketing_settings
for each row execute function private.record_marketing_audit();

create trigger marketing_targets_audit
after insert or update or delete on public.marketing_campaign_targets
for each row execute function private.record_marketing_audit();

create trigger marketing_assets_audit
after insert or update or delete on public.marketing_campaign_assets
for each row execute function private.record_marketing_audit();

create trigger marketing_placements_audit
after insert or update or delete on public.marketing_campaign_placements
for each row execute function private.record_marketing_audit();

create trigger marketing_badges_audit
after insert or update or delete on public.marketing_campaign_badges
for each row execute function private.record_marketing_audit();

alter table public.marketing_settings enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.marketing_campaign_targets enable row level security;
alter table public.marketing_campaign_assets enable row level security;
alter table public.marketing_campaign_placements enable row level security;
alter table public.marketing_campaign_badges enable row level security;
alter table public.marketing_audit_log enable row level security;

revoke all on
  public.marketing_settings,
  public.marketing_campaigns,
  public.marketing_campaign_targets,
  public.marketing_campaign_assets,
  public.marketing_campaign_placements,
  public.marketing_campaign_badges,
  public.marketing_audit_log
from public;

grant select on
  public.marketing_settings,
  public.marketing_campaigns,
  public.marketing_campaign_targets,
  public.marketing_campaign_assets,
  public.marketing_campaign_placements,
  public.marketing_campaign_badges
to anon, authenticated;

grant update on public.marketing_settings to authenticated;
grant insert, update on public.marketing_campaigns to authenticated;

grant insert, update, delete on
  public.marketing_campaign_targets,
  public.marketing_campaign_assets,
  public.marketing_campaign_placements,
  public.marketing_campaign_badges
to authenticated;

grant select on public.marketing_audit_log to authenticated;

create policy "public can read marketing settings"
on public.marketing_settings
for select
to anon, authenticated
using (true);

create policy "admins can update marketing settings"
on public.marketing_settings
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "public can read active marketing campaigns"
on public.marketing_campaigns
for select
to anon
using (
  status = 'published'
  and start_at <= now()
  and (end_at is null or now() < end_at)
  and exists (
    select 1
    from public.marketing_settings as settings
    where settings.id = 1 and settings.enabled
  )
);

create policy "authenticated can read active campaigns or admin campaigns"
on public.marketing_campaigns
for select
to authenticated
using (
  (
    status = 'published'
    and start_at <= now()
    and (end_at is null or now() < end_at)
    and exists (
      select 1
      from public.marketing_settings as settings
      where settings.id = 1 and settings.enabled
    )
  )
  or (select private.is_admin())
);

create policy "admins can create draft marketing campaigns"
on public.marketing_campaigns
for insert
to authenticated
with check (
  (select private.is_admin())
  and status = 'draft'
);

create policy "admins can update marketing campaigns"
on public.marketing_campaigns
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "public can read active marketing targets"
on public.marketing_campaign_targets
for select
to anon
using (
  exists (
    select 1
    from public.marketing_campaigns as campaign
    where campaign.id = marketing_campaign_targets.campaign_id
  )
);

create policy "authenticated can read active targets or admin targets"
on public.marketing_campaign_targets
for select
to authenticated
using (
  exists (
    select 1
    from public.marketing_campaigns as campaign
    where campaign.id = marketing_campaign_targets.campaign_id
  )
);

create policy "admins can manage marketing targets"
on public.marketing_campaign_targets
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "public can read active marketing assets"
on public.marketing_campaign_assets
for select
to anon
using (
  lifecycle_status = 'active'
  and exists (
    select 1
    from public.marketing_campaigns as campaign
    where campaign.id = marketing_campaign_assets.campaign_id
  )
);

create policy "authenticated can read active assets or admin assets"
on public.marketing_campaign_assets
for select
to authenticated
using (
  (
    lifecycle_status = 'active'
    and exists (
      select 1
      from public.marketing_campaigns as campaign
      where campaign.id = marketing_campaign_assets.campaign_id
    )
  )
  or (select private.is_admin())
);

create policy "admins can manage marketing assets"
on public.marketing_campaign_assets
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "public can read active marketing placements"
on public.marketing_campaign_placements
for select
to anon
using (
  exists (
    select 1
    from public.marketing_campaigns as campaign
    where campaign.id = marketing_campaign_placements.campaign_id
  )
);

create policy "authenticated can read active placements or admin placements"
on public.marketing_campaign_placements
for select
to authenticated
using (
  exists (
    select 1
    from public.marketing_campaigns as campaign
    where campaign.id = marketing_campaign_placements.campaign_id
  )
);

create policy "admins can manage marketing placements"
on public.marketing_campaign_placements
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "public can read active marketing badges"
on public.marketing_campaign_badges
for select
to anon
using (
  exists (
    select 1
    from public.marketing_campaigns as campaign
    where campaign.id = marketing_campaign_badges.campaign_id
  )
);

create policy "authenticated can read active badges or admin badges"
on public.marketing_campaign_badges
for select
to authenticated
using (
  exists (
    select 1
    from public.marketing_campaigns as campaign
    where campaign.id = marketing_campaign_badges.campaign_id
  )
);

create policy "admins can manage marketing badges"
on public.marketing_campaign_badges
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "admins can read marketing audit"
on public.marketing_audit_log
for select
to authenticated
using ((select private.is_admin()));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'campaign-images',
  'campaign-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "marketing admins can read campaign images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'campaign-images'
  and (select private.is_admin())
);

create policy "marketing admins can upload campaign images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'campaign-images'
  and (select private.is_admin())
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "marketing admins can update campaign images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'campaign-images'
  and (select private.is_admin())
)
with check (
  bucket_id = 'campaign-images'
  and (select private.is_admin())
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "marketing admins can delete campaign images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'campaign-images'
  and (select private.is_admin())
);

-- Expõe somente o próximo instante de mudança visual. Isso permite que uma
-- página já aberta atualize campanhas futuras sem confiar no relógio do cliente.
create or replace function public.marketing_next_boundary()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with next_boundary as (
    select min(boundary) as value
    from (
      select campaign.start_at as boundary
      from public.marketing_campaigns campaign
      where campaign.status = 'published' and campaign.start_at > now()
      union all
      select campaign.end_at as boundary
      from public.marketing_campaigns campaign
      where campaign.status = 'published' and campaign.end_at > now()
    ) boundaries
    where exists (
      select 1 from public.marketing_settings settings
      where settings.id = 1 and settings.enabled
    )
  )
  select case when value is null then null else jsonb_build_object(
    'at', value,
    'delayMs', greatest(0, floor(extract(epoch from (value - now())) * 1000)::bigint)
  ) end
  from next_boundary;
$$;

revoke all on function public.marketing_next_boundary() from public;
grant execute on function public.marketing_next_boundary() to anon, authenticated;

create or replace function public.active_marketing_campaign_ids()
returns uuid[]
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(array_agg(campaign.id order by campaign.priority desc, campaign.start_at desc), '{}'::uuid[])
  from public.marketing_campaigns campaign
  where campaign.status = 'published'
    and campaign.start_at <= now()
    and (campaign.end_at is null or now() < campaign.end_at)
    and exists (
      select 1 from public.marketing_settings settings
      where settings.id = 1 and settings.enabled
    );
$$;

revoke all on function public.active_marketing_campaign_ids() from public;
grant execute on function public.active_marketing_campaign_ids() to anon, authenticated;
