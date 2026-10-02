import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCampaign } from '@/lib/campaign';
import { useCampaignData, logActivity, getLatestMetric, sumMetric, latestCombinedAudience, getFirstMetric } from '@/lib/data';
import { useToast } from '@/lib/toast';
import { FB_PAGE_METRICS, FB_GROUP_METRICS, IG_METRICS, WEBSITE_METRICS } from '@/lib/constants';
import { Loading, Badge, EmptyState } from '@/components/ui';
import { Save, Lightbulb, TrendingUp, Award, Target } from 'lucide-react';
import { downloadCSV, formatDate, pct } from '@/lib/utils';

const PLATFORM_GROUPS = [
  { platform: 'Facebook Page', fields: FB_PAGE_METRICS },
  { platform: 'Facebook Group', fields: FB_GROUP_METRICS },
  { platform: 'Instagram', fields: IG_METRICS },
  { platform: 'Website', fields: WEBSITE_METRICS },
];

export function AnalyticsScreen() {
  const { campaign } = useCampaign();
  const { user } = useAuth();
  const { dailyMetrics, content, contentMetrics, loading, reload } = useCampaignData();
  const { toast } = useToast();
  const [tab, setTab] = useState<'entry' | 'charts' | 'smart'>('entry');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [values, setValues] = useState<Record<string, string>>({});

  const saveMetrics = async () => {
    if (!campaign || !user) return;
    for (const pg of PLATFORM_GROUPS) {
      const metrics: Record<string, number> = {};
      for (const field of pg.fields) {
        const v = values[`${pg.platform}_${field}`];
        if (v !== undefined && v !== '' && !isNaN(Number(v))) metrics[field] = Number(v);
      }
      if (Object.keys(metrics).length === 0) continue;
      const existing = dailyMetrics.find((m) => m.platform === pg.platform && m.metric_date === entryDate);
      if (existing) {
        await supabase.from('daily_metrics').update({ metrics: { ...existing.metrics, ...metrics } }).eq('id', existing.id);
      } else {
        await supabase.from('daily_metrics').insert({ campaign_id: campaign.id, metric_date: entryDate, platform: pg.platform, metrics, created_by: user.id });
      }
      await logActivity(campaign.id, user.id, `entered ${pg.platform} analytics`, entryDate);
    }
    toast('Analytics saved');
    setValues({});
    reload();
  };

  const exportCSV = () => {
    const rows = dailyMetrics.map((m) => ({ date: m.metric_date, platform: m.platform, ...m.metrics }));
    downloadCSV('analytics.csv', rows);
    toast('Analytics CSV downloaded');
  };

  const recommendations = useMemo(() => generateRecommendations(dailyMetrics, content, contentMetrics), [dailyMetrics, content, contentMetrics]);

  if (loading) return <Loading label="Loading analytics…" />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="section-title">Manual Analytics</h2>
        <p className="text-xs text-stone-500">Enter real numbers from your platform insights</p>
      </div>

      <div className="flex bg-ivory-100 rounded-xl p-1">
        {([['entry', 'Enter Data'], ['charts', 'Charts'], ['smart', 'Smart']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${tab === k ? 'bg-white text-charcoal-900 shadow-soft' : 'text-stone-500'}`}>{l}</button>
        ))}
      </div>

      {tab === 'entry' && (
        <div className="space-y-4">
          <div className="card">
            <label className="label">Entry date</label>
            <input className="input" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          {PLATFORM_GROUPS.map((pg) => (
            <div key={pg.platform} className="card-elev">
              <h3 className="text-sm font-bold text-charcoal-900 mb-3">{pg.platform}</h3>
              <div className="grid grid-cols-2 gap-3">
                {pg.fields.map((f) => (
                  <div key={f}>
                    <label className="label">{f}</label>
                    <input className="input" type="number" min="0" placeholder="0" value={values[`${pg.platform}_${f}`] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [`${pg.platform}_${f}`]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button onClick={saveMetrics} className="btn-primary w-full"><Save size={16} /> Save Analytics</button>
        </div>
      )}

      {tab === 'charts' && (
        <div className="space-y-4">
          {dailyMetrics.length === 0 ? (
            <EmptyState icon={<TrendingUp size={28} />} title="No analytics yet" description="Enter your first metrics to see charts." />
          ) : (
            <>
              <div className="card-elev">
                <h3 className="text-sm font-bold text-charcoal-900 mb-3">Combined Audience Growth</h3>
                <LineChart data={buildCombinedSeries(dailyMetrics)} />
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <Stat label="Current" value={latestCombinedAudience(dailyMetrics)} />
                  <Stat label="Target" value={campaign?.target ?? 500} />
                  <Stat label="Gap" value={Math.max(0, (campaign?.target ?? 500) - latestCombinedAudience(dailyMetrics))} />
                </div>
              </div>
              <ChartCard title="Facebook Page Followers" data={buildSeries(dailyMetrics, 'Facebook Page', 'Followers')} />
              <ChartCard title="Facebook Group Members" data={buildSeries(dailyMetrics, 'Facebook Group', 'Members')} />
              <ChartCard title="Instagram Followers" data={buildSeries(dailyMetrics, 'Instagram', 'Followers')} />
              <ChartCard title="Daily Reach" data={buildSeries(dailyMetrics, 'Instagram', 'Reach')} />
              <ChartCard title="Daily Impressions" data={buildSeries(dailyMetrics, 'Instagram', 'Impressions')} />
              <ChartCard title="Engagement" data={buildSeries(dailyMetrics, 'Facebook Page', 'Engagement')} />
              <ChartCard title="Website Clicks" data={buildSeries(dailyMetrics, 'Website', 'Social clicks')} />
              <div className="card-elev">
                <h3 className="text-sm font-bold text-charcoal-900 mb-3">Platform Comparison (Followers/Members)</h3>
                <BarCompare data={[
                  { label: 'FB Page', value: getLatestMetric(dailyMetrics, 'Facebook Page', 'Followers') },
                  { label: 'FB Group', value: getLatestMetric(dailyMetrics, 'Facebook Group', 'Members') },
                  { label: 'Instagram', value: getLatestMetric(dailyMetrics, 'Instagram', 'Followers') },
                ]} />
              </div>
              <div className="card-elev">
                <h3 className="text-sm font-bold text-charcoal-900 mb-3">Content Format Comparison</h3>
                <FormatCompare content={content} contentMetrics={contentMetrics} />
              </div>
              <button onClick={exportCSV} className="btn-ghost w-full">Export Analytics CSV</button>
            </>
          )}
        </div>
      )}

      {tab === 'smart' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb size={18} className="text-brand-500" />
            <h3 className="section-title">Smart Recommendations</h3>
          </div>
          <p className="text-xs text-stone-500">Based on entered campaign data</p>
          {recommendations.length === 0 ? (
            <EmptyState icon={<Target size={28} />} title="No recommendations yet" description="Enter more analytics and publish content to unlock insights." />
          ) : (
            recommendations.map((r, i) => (
              <div key={i} className="card">
                <div className="flex items-start gap-2">
                  <Award size={16} className="text-brand-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-charcoal-900">{r}</p>
                    <Badge color="neutral">Based on entered campaign data</Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="bg-ivory-50 rounded-xl py-2.5"><p className="stat-value text-lg">{value.toLocaleString()}</p><p className="stat-label mt-0.5">{label}</p></div>;
}

function ChartCard({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <div className="card"><p className="text-sm font-bold text-charcoal-900 mb-2">{title}</p><p className="text-xs text-stone-400">No data yet</p></div>;
  }
  return <div className="card"><p className="text-sm font-bold text-charcoal-900 mb-3">{title}</p><LineChart data={data} /></div>;
}

function LineChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => {
        const h = (d.value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
            <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition bg-charcoal-900 text-ivory-50 text-[10px] rounded px-1.5 py-0.5 z-10 whitespace-nowrap">{d.value}</div>
            <div className="w-full bg-brand-200 rounded-t-md transition-all hover:bg-brand-500" style={{ height: `${Math.max(2, h)}%` }} />
            <span className="text-[8px] text-stone-400 mt-1 truncate w-full text-center">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function BarCompare({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex justify-between text-xs mb-1"><span className="text-stone-600">{d.label}</span><span className="font-bold text-charcoal-900">{d.value.toLocaleString()}</span></div>
          <div className="h-3 rounded-full bg-ivory-200"><div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${(d.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function FormatCompare({ content, contentMetrics }: { content: any[]; contentMetrics: any[] }) {
  const byFormat: Record<string, number> = {};
  for (const c of content) {
    const cm = contentMetrics.find((m) => m.content_id === c.id);
    const reach = cm?.metrics?.Reach ?? 0;
    byFormat[c.format] = (byFormat[c.format] ?? 0) + reach;
  }
  const entries = Object.entries(byFormat).filter(([, v]) => v > 0);
  if (entries.length === 0) return <p className="text-xs text-stone-400">No content performance data yet</p>;
  const max = Math.max(...entries.map((e) => e[1]));
  return (
    <div className="space-y-2">
      {entries.sort((a, b) => b[1] - a[1]).map(([f, v]) => (
        <div key={f}>
          <div className="flex justify-between text-xs mb-1"><span className="text-stone-600">{f}</span><span className="font-bold text-charcoal-900">{v.toLocaleString()}</span></div>
          <div className="h-3 rounded-full bg-ivory-200"><div className="h-full bg-violet-500 rounded-full" style={{ width: `${(v / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function buildSeries(metrics: any[], platform: string, field: string) {
  return metrics.filter((m) => m.platform === platform && m.metrics?.[field] != null).sort((a, b) => a.metric_date.localeCompare(b.metric_date)).map((m) => ({ label: m.metric_date.slice(5), value: m.metrics[field] ?? 0 }));
}
function buildCombinedSeries(metrics: any[]) {
  const byDate: Record<string, number> = {};
  for (const m of metrics) {
    const key = m.metric_date;
    const val = (m.platform === 'Facebook Page' && m.metrics?.Followers) || (m.platform === 'Facebook Group' && m.metrics?.Members) || (m.platform === 'Instagram' && m.metrics?.Followers) || 0;
    if (val) byDate[key] = (byDate[key] ?? 0) + val;
  }
  return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([d, v]) => ({ label: d.slice(5), value: v }));
}

function generateRecommendations(metrics: any[], content: any[], contentMetrics: any[]): string[] {
  const recs: string[] = [];
  if (metrics.length === 0) return recs;

  const reels = content.filter((c) => c.format.includes('Reel'));
  const statics = content.filter((c) => c.format === 'Static Post');
  const reelReach = sumContentReach(contentMetrics, reels);
  const staticReach = sumContentReach(contentMetrics, statics);
  if (reelReach > 0 && staticReach > 0 && reelReach > staticReach) recs.push('Reels received more reach than static posts. Prioritize short-form video.');
  if (reelReach > 0 && staticReach > 0 && staticReach > reelReach) recs.push('Static posts are outperforming Reels in reach. Test more static content.');

  const tutorials = content.filter((c) => c.format.includes('Tutorial'));
  const tutorialGain = sumContentMetric(contentMetrics, tutorials, 'Followers gained');
  if (tutorialGain > 0) recs.push('Tutorials generated more followers. Create more educational tutorials.');

  const carousels = content.filter((c) => c.format === 'Carousel');
  const carouselSaves = sumContentMetric(contentMetrics, carousels, 'Saves');
  if (carouselSaves > 0) recs.push('Carousels received more saves. Use carousels for save-worthy content.');

  const groupEng = getLatestMetric(metrics, 'Facebook Group', 'Engagement');
  const pageEng = getLatestMetric(metrics, 'Facebook Page', 'Engagement');
  if (groupEng > 0 && pageEng >= 0 && groupEng > pageEng) recs.push('Facebook Group engagement is stronger than the Page. Focus community-building in the Group.');

  const igProfile = getLatestMetric(metrics, 'Instagram', 'Profile visits');
  const igFollowers = getLatestMetric(metrics, 'Instagram', 'Followers');
  const igFirst = getFirstMetric(metrics, 'Instagram', 'Followers');
  const igGained = igFollowers - igFirst;
  if (igProfile > 0 && igGained >= 0 && igProfile > igGained * 3) recs.push('Instagram profile visits are high but follower conversion is low. Optimize your bio and add a stronger CTA.');

  const publishedNoResults = content.filter((c) => c.status === 'Published' && !contentMetrics.some((cm) => cm.content_id === c.id));
  if (publishedNoResults.length > 0) recs.push(`${publishedNoResults.length} published post(s) are missing performance data. Add results in the Library.`);

  const todayStr = new Date().toISOString().slice(0, 10);
  const platformsToday = new Set(content.filter((c) => c.published_at && c.published_at.slice(0, 10) === todayStr).map((c) => c.platform));
  ['Facebook Page', 'Facebook Group', 'Instagram'].forEach((p) => { if (!platformsToday.has(p)) recs.push(`${p} has not received content today. Schedule a post.`); });

  return recs;
}

function sumContentReach(contentMetrics: any[], items: any[]): number {
  return items.reduce((s, c) => s + (contentMetrics.find((cm) => cm.content_id === c.id)?.metrics?.Reach ?? 0), 0);
}
function sumContentMetric(contentMetrics: any[], items: any[], field: string): number {
  return items.reduce((s, c) => s + (contentMetrics.find((cm) => cm.content_id === c.id)?.metrics?.[field] ?? 0), 0);
}
