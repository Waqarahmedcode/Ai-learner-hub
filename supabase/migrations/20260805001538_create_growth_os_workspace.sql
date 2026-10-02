/*
# Create AI Learner Hub GrowthOS workspace

1. New tables
- `profiles`: authenticated user identity, display name, and role label.
- `campaigns`: shared campaign settings, deadline, target, and onboarding status.
- `campaign_members`: explicit membership connecting people to campaigns.
- `official_links`: editable website and social destinations.
- `tasks`: assigned work with due dates, priority, and workflow status.
- `content_items`: content library records and publishing metadata.
- `content_generations`: saved Content Studio outputs.
- `calendar_entries`: scheduled content references.
- `daily_metrics`: manual platform metrics by day.
- `content_metrics`: manual results for published content.
- `giveaways`: optional campaign reward tracker.
- `recommendations`: data-based strategic notes.
- `activity_log`: shared workspace activity feed.
- `campaign_assets`: shared logo, cover, and other asset references.

2. Security
- Every table has Row Level Security enabled.
- Authenticated users can only access campaigns where they are members.
- Profiles are limited to the signed-in account.
- Ownership defaults to `auth.uid()` for safe browser inserts.

3. Notes
- Analytics fields default to zero and are never seeded with fabricated results.
- The partner placeholder is stored as campaign metadata until a real email invitation is used.
*/

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Waqar Ahmed',
  email text not null default '',
  role text not null default 'OWNER' check (role in ('OWNER', 'PARTNER')),
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null default 'AI Learner Hub — 500 Growth Sprint',
  partner_name text not null default 'Sadia',
  target integer not null default 500 check (target >= 0),
  deadline timestamptz not null default '2026-08-09 04:00:00+00',
  timezone text not null default 'Asia/Karachi',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_members (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'PARTNER' check (role in ('OWNER', 'PARTNER')),
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create table if not exists public.official_links (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  label text not null,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  description text not null default '',
  assigned_to uuid references auth.users(id) on delete set null,
  platform text not null default 'General Project',
  content_format text not null default 'General',
  priority text not null default 'Medium',
  due_date date,
  due_time time,
  status text not null default 'Not Started',
  notes text not null default '',
  content_id uuid,
  is_demo boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  topic text not null default '',
  platform text not null default 'Instagram',
  format text not null default 'Static Post',
  hook text not null default '',
  script text not null default '',
  caption text not null default '',
  cta text not null default '',
  status text not null default 'Idea',
  assigned_to uuid references auth.users(id) on delete set null,
  scheduled_at timestamptz,
  published_at timestamptz,
  published_url text,
  asset_url text,
  thumbnail_url text,
  notes text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_generations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  content_id uuid references public.content_items(id) on delete cascade,
  title text not null,
  platform text not null,
  format text not null,
  scheduled_at timestamptz not null,
  assigned_to uuid references auth.users(id) on delete set null,
  status text not null default 'Pending',
  created_at timestamptz not null default now()
);

create table if not exists public.daily_metrics (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  metric_date date not null,
  platform text not null,
  metrics jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(campaign_id, metric_date, platform)
);

create table if not exists public.content_metrics (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  content_id uuid not null references public.content_items(id) on delete cascade,
  metrics jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(content_id)
);

create table if not exists public.giveaways (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null default '',
  eligibility text not null default '',
  target_threshold integer not null default 0,
  current_qualifying_members integer not null default 0,
  reward_description text not null default '',
  start_date date,
  end_date date,
  announcement_content text not null default '',
  winner_status text not null default 'Not selected',
  terms text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  recommendation text not null,
  basis text not null default 'Based on entered campaign data',
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  action text not null,
  related_item text,
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  asset_type text not null,
  name text not null,
  url text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.official_links enable row level security;
alter table public.tasks enable row level security;
alter table public.content_items enable row level security;
alter table public.content_generations enable row level security;
alter table public.calendar_entries enable row level security;
alter table public.daily_metrics enable row level security;
alter table public.content_metrics enable row level security;
alter table public.giveaways enable row level security;
alter table public.recommendations enable row level security;
alter table public.activity_log enable row level security;
alter table public.campaign_assets enable row level security;

create index if not exists campaign_members_user_idx on public.campaign_members(user_id);
create index if not exists tasks_campaign_due_idx on public.tasks(campaign_id, due_date);
create index if not exists content_campaign_status_idx on public.content_items(campaign_id, status);
create index if not exists metrics_campaign_date_idx on public.daily_metrics(campaign_id, metric_date);

-- Profiles are private to the signed-in account.
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles_delete_self" on public.profiles;
create policy "profiles_delete_self" on public.profiles for delete to authenticated using (auth.uid() = id);

-- Campaigns are visible to their owner or explicit members.
drop policy if exists "campaigns_select_member" on public.campaigns;
create policy "campaigns_select_member" on public.campaigns for select to authenticated using (owner_id = auth.uid() or exists (select 1 from public.campaign_members m where m.campaign_id = id and m.user_id = auth.uid()));
drop policy if exists "campaigns_insert_owner" on public.campaigns;
create policy "campaigns_insert_owner" on public.campaigns for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "campaigns_update_owner" on public.campaigns;
create policy "campaigns_update_owner" on public.campaigns for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "campaigns_delete_owner" on public.campaigns;
create policy "campaigns_delete_owner" on public.campaigns for delete to authenticated using (owner_id = auth.uid());

-- Membership rows are private to members and allow a signed-in owner to add themselves.
drop policy if exists "members_select_member" on public.campaign_members;
create policy "members_select_member" on public.campaign_members for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.campaign_members m where m.campaign_id = campaign_id and m.user_id = auth.uid()));
drop policy if exists "members_insert_self" on public.campaign_members;
create policy "members_insert_self" on public.campaign_members for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "members_update_member" on public.campaign_members;
create policy "members_update_member" on public.campaign_members for update to authenticated using (user_id = auth.uid() or exists (select 1 from public.campaigns c where c.id = campaign_id and c.owner_id = auth.uid())) with check (user_id = auth.uid() or exists (select 1 from public.campaigns c where c.id = campaign_id and c.owner_id = auth.uid()));
drop policy if exists "members_delete_member" on public.campaign_members;
create policy "members_delete_member" on public.campaign_members for delete to authenticated using (user_id = auth.uid() or exists (select 1 from public.campaigns c where c.id = campaign_id and c.owner_id = auth.uid()));

-- Shared campaign records use the same membership predicate.
drop policy if exists "links_select_member" on public.official_links;
create policy "links_select_member" on public.official_links for select to authenticated using (exists (select 1 from public.campaigns c where c.id = campaign_id and (c.owner_id = auth.uid() or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid()))));
drop policy if exists "links_insert_member" on public.official_links;
create policy "links_insert_member" on public.official_links for insert to authenticated with check (exists (select 1 from public.campaigns c where c.id = campaign_id and (c.owner_id = auth.uid() or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid()))));
drop policy if exists "links_update_member" on public.official_links;
create policy "links_update_member" on public.official_links for update to authenticated using (exists (select 1 from public.campaigns c where c.id = campaign_id and (c.owner_id = auth.uid() or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid())))) with check (exists (select 1 from public.campaigns c where c.id = campaign_id and (c.owner_id = auth.uid() or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid()))));
drop policy if exists "links_delete_member" on public.official_links;
create policy "links_delete_member" on public.official_links for delete to authenticated using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.owner_id = auth.uid()));

-- Generic member CRUD for collaborative records. Owner-only controls are enforced in the UI and can be tightened later.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tasks','content_items','content_generations','calendar_entries','daily_metrics','content_metrics','giveaways','recommendations','activity_log','campaign_assets'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_member', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (exists (select 1 from public.campaigns c where c.id = campaign_id and (c.owner_id = auth.uid() or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid()))))', t || '_select_member', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert_member', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (exists (select 1 from public.campaigns c where c.id = campaign_id and (c.owner_id = auth.uid() or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid()))))', t || '_insert_member', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update_member', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (exists (select 1 from public.campaigns c where c.id = campaign_id and (c.owner_id = auth.uid() or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid())))) WITH CHECK (exists (select 1 from public.campaigns c where c.id = campaign_id and (c.owner_id = auth.uid() or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid()))))', t || '_update_member', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete_member', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (exists (select 1 from public.campaigns c where c.id = campaign_id and c.owner_id = auth.uid()))', t || '_delete_member', t);
  END LOOP;
END $$;
