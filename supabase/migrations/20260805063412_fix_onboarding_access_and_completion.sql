/*
# Fix onboarding access and completion state

1. Modified tables
- `profiles`: add `onboarding_completed` so a signed-in owner keeps completion state after refresh.

2. Security changes
- Replace the recursive `campaign_members` SELECT policy with a non-recursive policy.
- An authenticated owner can read all membership rows for campaigns they own.
- A partner can read their own membership row.
- A signed-in user can insert their own membership row only for a campaign they own.

3. Important notes
- Row Level Security remains enabled.
- No table is dropped and no user data is deleted.
- These policies allow the first authenticated user to create their campaign and owner membership without exposing other campaigns.
*/

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

update public.profiles
set onboarding_completed = true
where exists (
  select 1
  from public.campaigns c
  where c.owner_id = profiles.id
    and c.onboarding_complete = true
);

drop policy if exists "members_select_member" on public.campaign_members;
create policy "members_select_member"
on public.campaign_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.campaigns c
    where c.id = campaign_members.campaign_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "members_insert_self" on public.campaign_members;
create policy "members_insert_self"
on public.campaign_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.campaigns c
    where c.id = campaign_members.campaign_id
      and c.owner_id = auth.uid()
  )
);
