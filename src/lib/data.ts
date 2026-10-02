import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useCampaign } from './campaign';
import type { Task, ContentItem, DailyMetric, ContentMetric, CalendarEntry, ActivityLog } from './types';

export function useCampaignData() {
  const { campaign } = useCampaign();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [contentMetrics, setContentMetrics] = useState<ContentMetric[]>([]);
  const [calendar, setCalendar] = useState<CalendarEntry[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!campaign) {
      setTasks([]); setContent([]); setDailyMetrics([]); setContentMetrics([]); setCalendar([]); setActivity([]); setLoading(false);
      return;
    }
    setLoading(true);
    const cid = campaign.id;
    const [t, c, dm, cm, cal, act] = await Promise.all([
      supabase.from('tasks').select('*').eq('campaign_id', cid).order('created_at', { ascending: false }),
      supabase.from('content_items').select('*').eq('campaign_id', cid).order('created_at', { ascending: false }),
      supabase.from('daily_metrics').select('*').eq('campaign_id', cid).order('metric_date', { ascending: true }),
      supabase.from('content_metrics').select('*').eq('campaign_id', cid),
      supabase.from('calendar_entries').select('*').eq('campaign_id', cid).order('scheduled_at', { ascending: true }),
      supabase.from('activity_log').select('*').eq('campaign_id', cid).order('created_at', { ascending: false }).limit(50),
    ]);
    setTasks((t.data as Task[]) ?? []);
    setContent((c.data as ContentItem[]) ?? []);
    setDailyMetrics((dm.data as DailyMetric[]) ?? []);
    setContentMetrics((cm.data as ContentMetric[]) ?? []);
    setCalendar((cal.data as CalendarEntry[]) ?? []);
    setActivity((act.data as ActivityLog[]) ?? []);
    setLoading(false);
  }, [campaign]);

  useEffect(() => { load(); }, [load]);

  return { tasks, content, dailyMetrics, contentMetrics, calendar, activity, loading, reload: load };
}

export function logActivity(campaignId: string, userId: string, action: string, relatedItem?: string) {
  return supabase.from('activity_log').insert({
    campaign_id: campaignId,
    user_id: userId,
    action,
    related_item: relatedItem ?? null,
  });
}

export function getLatestMetric(metrics: DailyMetric[], platform: string, field: string): number {
  const platMetrics = metrics.filter((m) => m.platform === platform).sort((a, b) => a.metric_date.localeCompare(b.metric_date));
  const latest = platMetrics[platMetrics.length - 1];
  return latest?.metrics?.[field] ?? 0;
}

export function getFirstMetric(metrics: DailyMetric[], platform: string, field: string): number {
  const platMetrics = metrics.filter((m) => m.platform === platform).sort((a, b) => a.metric_date.localeCompare(b.metric_date));
  const first = platMetrics[0];
  return first?.metrics?.[field] ?? 0;
}

export function sumMetric(metrics: DailyMetric[], field: string): number {
  return metrics.reduce((sum, m) => sum + (m.metrics?.[field] ?? 0), 0);
}

export function latestCombinedAudience(metrics: DailyMetric[]): number {
  return (
    getLatestMetric(metrics, 'Facebook Page', 'Followers') +
    getLatestMetric(metrics, 'Facebook Group', 'Members') +
    getLatestMetric(metrics, 'Instagram', 'Followers')
  );
}
