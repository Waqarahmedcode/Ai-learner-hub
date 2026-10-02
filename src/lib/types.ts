export type Role = 'OWNER' | 'PARTNER';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  avatar_url: string | null;
  active: boolean;
  onboarding_completed: boolean;
  created_at: string;
}

export interface Campaign {
  id: string;
  owner_id: string;
  name: string;
  partner_name: string;
  target: number;
  deadline: string;
  timezone: string;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignMember {
  campaign_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
}

export interface OfficialLink {
  id: string;
  campaign_id: string;
  label: string;
  url: string;
  sort_order: number;
  created_at: string;
}

export interface Task {
  id: string;
  campaign_id: string;
  title: string;
  description: string;
  assigned_to: string | null;
  platform: string;
  content_format: string;
  priority: string;
  due_date: string | null;
  due_time: string | null;
  status: string;
  notes: string;
  content_id: string | null;
  is_demo: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  campaign_id: string;
  title: string;
  topic: string;
  platform: string;
  format: string;
  hook: string;
  script: string;
  caption: string;
  cta: string;
  status: string;
  assigned_to: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  published_url: string | null;
  asset_url: string | null;
  thumbnail_url: string | null;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContentGeneration {
  id: string;
  campaign_id: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

export interface CalendarEntry {
  id: string;
  campaign_id: string;
  content_id: string | null;
  title: string;
  platform: string;
  format: string;
  scheduled_at: string;
  assigned_to: string | null;
  status: string;
  created_at: string;
}

export interface DailyMetric {
  id: string;
  campaign_id: string;
  metric_date: string;
  platform: string;
  metrics: Record<string, number>;
  created_by: string;
  created_at: string;
}

export interface ContentMetric {
  id: string;
  campaign_id: string;
  content_id: string;
  metrics: Record<string, number>;
  created_by: string;
  created_at: string;
}

export interface Giveaway {
  id: string;
  campaign_id: string;
  title: string;
  eligibility: string;
  target_threshold: number;
  current_qualifying_members: number;
  reward_description: string;
  start_date: string | null;
  end_date: string | null;
  announcement_content: string;
  winner_status: string;
  terms: string;
  notes: string;
  created_at: string;
}

export interface Recommendation {
  id: string;
  campaign_id: string;
  recommendation: string;
  basis: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  campaign_id: string;
  user_id: string;
  action: string;
  related_item: string | null;
  created_at: string;
}

export interface CampaignAsset {
  id: string;
  campaign_id: string;
  asset_type: string;
  name: string;
  url: string;
  created_at: string;
}
