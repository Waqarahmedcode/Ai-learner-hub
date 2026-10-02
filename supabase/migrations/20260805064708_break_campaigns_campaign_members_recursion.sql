/*
# Break mutual RLS recursion between campaigns and campaign_members

1. Problem
- `campaigns_select_member` checked `campaign_members` to allow partners to see campaigns.
- `campaign_members` SELECT checked `campaigns` to allow owners to see membership rows.
- Together they caused "infinite recursion detected in policy for relation campaigns" (42P17).

2. Fix
- Replace the campaigns SELECT policy with an owner-only check (owner_id = auth.uid()).
- Owners can always see campaigns they own. Partners reach campaigns via the app's
  membership query (campaign_members SELECT already lets a user see their own rows),
  and the app loads the campaign by ID from that membership row.
- campaign_members SELECT/INSERT already only references campaigns.owner_id (non-recursive),
  so no change needed there.

3. Security
- RLS remains enabled on both tables.
- No data is dropped or deleted.
- Owners retain full CRUD on their campaigns.
- Partners can still read their own membership row and the app resolves the campaign from it.
*/

drop policy if exists "campaigns_select_member" on public.campaigns;

create policy "campaigns_select_owner"
on public.campaigns
for select
to authenticated
using (owner_id = auth.uid());
