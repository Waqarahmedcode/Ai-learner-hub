import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { DEFAULT_LINKS } from './constants';
import type { Campaign, CampaignMember, OfficialLink, Profile } from './types';

interface CampaignContextValue {
  campaign: Campaign | null;
  members: (CampaignMember & { profile?: Profile })[];
  links: OfficialLink[];
  partnerProfile: Profile | null;
  loading: boolean;
  needOnboarding: boolean;
  refresh: () => Promise<void>;
  setCampaign: (c: Campaign | null) => void;
  ensureOnboarded: () => Promise<void>;
}

const CampaignContext = createContext<CampaignContextValue | undefined>(undefined);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const { user, profile, isOwner } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [members, setMembers] = useState<(CampaignMember & { profile?: Profile })[]>([]);
  const [links, setLinks] = useState<OfficialLink[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setCampaign(null);
      setMembers([]);
      setLinks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: memberRows, error: memberError } = await supabase
      .from('campaign_members')
      .select('campaign_id, user_id, role, joined_at')
      .eq('user_id', user.id);
    if (memberError) console.error('Campaign membership load error', memberError);
    let cids = (memberRows ?? []).map((m) => m.campaign_id);
    if (cids.length === 0) {
      const { data: ownerCampaigns, error: ownerError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);
      if (ownerError) console.error('Owner campaign load error', ownerError);
      cids = (ownerCampaigns ?? []).map((c) => c.id);
    }
    if (cids.length === 0) {
      setCampaign(null);
      setMembers([]);
      setLinks([]);
      setLoading(false);
      return;
    }
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .in('id', cids)
      .order('created_at', { ascending: true });
    if (campaignError) console.error('Campaign load error', campaignError);
    const c = (campaigns?.[0] as Campaign) ?? null;
    setCampaign(c);
    if (c) {
      const { data: allMembers } = await supabase
        .from('campaign_members')
        .select('campaign_id, user_id, role, joined_at')
        .eq('campaign_id', c.id);
      const memberIds = (allMembers ?? []).map((m) => m.user_id);
      const { data: memberProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', memberIds.length ? memberIds : ['00000000-0000-0000-0000-000000000000']);
      const profileMap = new Map<string, Profile>();
      (memberProfiles ?? []).forEach((p) => profileMap.set((p as Profile).id, p as Profile));
      const enriched = (allMembers ?? []).map((m) => ({
        ...m,
        profile: profileMap.get(m.user_id),
      })) as (CampaignMember & { profile?: Profile })[];
      setMembers(enriched);
      const { data: linkRows } = await supabase
        .from('official_links')
        .select('*')
        .eq('campaign_id', c.id)
        .order('sort_order', { ascending: true });
      setLinks((linkRows ?? []) as OfficialLink[]);
    } else {
      setMembers([]);
      setLinks([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load, profile, isOwner]);

  const partnerProfile = members.find((m) => m.role === 'PARTNER' && m.profile)?.profile ?? null;

  const ensureOnboarded = useCallback(async () => {
    await load();
  }, [load]);

  const needOnboarding = !loading && !!user && !!profile && (!campaign || !campaign.onboarding_complete);

  return (
    <CampaignContext.Provider
      value={{
        campaign,
        members,
        links,
        partnerProfile,
        loading,
        needOnboarding,
        refresh: load,
        setCampaign,
        ensureOnboarded,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign(): CampaignContextValue {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error('useCampaign must be used within CampaignProvider');
  return ctx;
}

export async function createCampaignWithDefaults(
  userId: string,
  overrides?: Partial<Campaign>
): Promise<Campaign> {
  const { data: existingCampaigns, error: existingError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1);
  if (existingError) throw new Error(existingError.message);

  let campaign = (existingCampaigns?.[0] as Campaign | undefined) ?? null;
  if (!campaign) {
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        owner_id: userId,
        name: overrides?.name ?? 'AI Learner Hub — 500 Growth Sprint',
        partner_name: overrides?.partner_name ?? 'Sadia',
        target: overrides?.target ?? 500,
        deadline: overrides?.deadline ?? '2026-08-09T04:00:00Z',
        timezone: overrides?.timezone ?? 'Asia/Karachi',
        onboarding_complete: false,
      })
      .select()
      .maybeSingle();
    if (error || !data) throw new Error(error?.message ?? 'Campaign could not be created.');
    campaign = data as Campaign;
  }

  const { error: memberError } = await supabase.from('campaign_members').upsert(
    { campaign_id: campaign.id, user_id: userId, role: 'OWNER' },
    { onConflict: 'campaign_id,user_id' }
  );
  if (memberError) throw new Error(memberError.message);

  const { data: existingLinks, error: linksError } = await supabase
    .from('official_links')
    .select('id')
    .eq('campaign_id', campaign.id)
    .limit(1);
  if (linksError) throw new Error(linksError.message);
  if (!existingLinks?.length) {
    const { error } = await supabase.from('official_links').insert(
      DEFAULT_LINKS.map((l) => ({ ...l, campaign_id: campaign.id }))
    );
    if (error) throw new Error(error.message);
  }
  return campaign;
}
