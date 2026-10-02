import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCampaign } from '@/lib/campaign';
import { useCampaignData, getLatestMetric, getFirstMetric, sumMetric, latestCombinedAudience } from '@/lib/data';
import { useToast } from '@/lib/toast';
import { downloadCSV, formatDate, pct } from '@/lib/utils';
import { ProgressRing, ProgressBar, Loading, Badge } from '@/components/ui';
import { Printer, Download, Play, X, ChevronRight } from 'lucide-react';

export function ReportScreen() {
  const { profile } = useAuth();
  const { campaign, links } = useCampaign();
  const { tasks, content, dailyMetrics, contentMetrics, loading } = useCampaignData();
  const { toast } = useToast();
  const [presenting, setPresenting] = useState(false);

  const data = useMemo(() => {
    const combined = latestCombinedAudience(dailyMetrics);
    const firstCombined = getFirstMetric(dailyMetrics, 'Facebook Page', 'Followers') + getFirstMetric(dailyMetrics, 'Facebook Group', 'Members') + getFirstMetric(dailyMetrics, 'Instagram', 'Followers');
    const growthPct = firstCombined > 0 ? Math.round(((combined - firstCombined) / firstCombined) * 100) : 0;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const published = content.filter((c) => c.status === 'Published' || c.status === 'Results Added').length;
    const reels = content.filter((c) => c.format.includes('Reel')).length;
    const stories = content.filter((c) => c.format === 'Story Sequence').length;
    const carousels = content.filter((c) => c.format === 'Carousel').length;
    const statics = content.filter((c) => c.format === 'Static Post').length;
    const tutorials = content.filter((c) => c.format.includes('Tutorial')).length;
    return { combined, firstCombined, growthPct, completed, published, reels, stories, carousels, statics, tutorials };
  }, [tasks, content, dailyMetrics]);

  if (loading) return <Loading label="Building report…" />;
  if (!campaign) return <p className="text-sm text-stone-500">No campaign found.</p>;

  const exportTasks = () => { downloadCSV('tasks.csv', tasks as unknown as Record<string, unknown>[]); toast('Tasks CSV downloaded'); };
  const exportContent = () => { downloadCSV('content.csv', content as unknown as Record<string, unknown>[]); toast('Content CSV downloaded'); };
  const exportAnalytics = () => { downloadCSV('analytics.csv', dailyMetrics.map((m) => ({ date: m.metric_date, platform: m.platform, ...m.metrics })) as Record<string, unknown>[]); toast('Analytics CSV downloaded'); };
  const print = () => window.print();

  const beforeAfter = [
    { label: 'Facebook Page followers', before: getFirstMetric(dailyMetrics, 'Facebook Page', 'Followers'), after: getLatestMetric(dailyMetrics, 'Facebook Page', 'Followers') },
    { label: 'Facebook Group members', before: getFirstMetric(dailyMetrics, 'Facebook Group', 'Members'), after: getLatestMetric(dailyMetrics, 'Facebook Group', 'Members') },
    { label: 'Instagram followers', before: getFirstMetric(dailyMetrics, 'Instagram', 'Followers'), after: getLatestMetric(dailyMetrics, 'Instagram', 'Followers') },
    { label: 'Website visitors', before: getFirstMetric(dailyMetrics, 'Website', 'Visitors'), after: getLatestMetric(dailyMetrics, 'Website', 'Visitors') },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <div><h2 className="section-title">Project Report</h2><p className="text-xs text-stone-500">University project report & presentation</p></div>
        <button onClick={() => setPresenting(true)} className="btn-primary !py-2.5"><Play size={16} /> Present</button>
      </div>

      {/* Print-friendly report */}
      <div className="card-elev space-y-6" id="report">
        <div className="text-center border-b border-ivory-200 pb-4">
          <img src="/logo.svg" alt="AI Learner Hub" className="w-16 h-16 mx-auto rounded-xl object-contain" />
          <h1 className="text-2xl font-display text-charcoal-950 mt-3 tracking-tight">AI Learner Hub — GrowthOS</h1>
          <p className="text-sm text-stone-500">{campaign.name}</p>
          <p className="text-xs text-stone-400 mt-1">Owner: {profile?.full_name ?? 'Waqar Ahmed'} • Partner: {campaign.partner_name}</p>
        </div>

        <Section title="Campaign Objective">
          <p className="text-sm text-stone-600">Reach {campaign.target} combined genuine followers and community members across Facebook Page, Facebook Group, and Instagram by {formatDate(campaign.deadline)} ({campaign.timezone}).</p>
        </Section>

        <Section title="Target Audience">
          <p className="text-sm text-stone-600">Beginners and creators interested in AI tools, tutorials, prompts, content creation, and modern digital skills.</p>
        </Section>

        <Section title="Official Platform Links">
          <ul className="text-sm text-stone-600 space-y-1">
            {links.map((l) => <li key={l.id}><span className="font-semibold">{l.label}:</span> {l.url}</li>)}
          </ul>
        </Section>

        <Section title="Campaign Timeline">
          <p className="text-sm text-stone-600">Started: {formatDate(campaign.created_at)} — Deadline: {formatDate(campaign.deadline)} at {new Date(campaign.deadline).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ({campaign.timezone})</p>
        </Section>

        <Section title="Execution Summary">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ReportStat label="Total tasks" value={tasks.length} />
            <ReportStat label="Completed tasks" value={data.completed} />
            <ReportStat label="Published posts" value={data.published} />
            <ReportStat label="Reels created" value={data.reels} />
            <ReportStat label="Carousels" value={data.carousels} />
            <ReportStat label="Static posts" value={data.statics} />
            <ReportStat label="Tutorials" value={data.tutorials} />
            <ReportStat label="Stories" value={data.stories} />
          </div>
        </Section>

        <Section title="Before vs After">
          <div className="space-y-2">
            {beforeAfter.map((ba) => (
              <div key={ba.label} className="flex items-center justify-between bg-ivory-50 rounded-xl p-3">
                <span className="text-sm text-stone-600 flex-1">{ba.label}</span>
                <span className="text-sm font-bold text-stone-400">{ba.before}</span>
                <ChevronRight size={14} className="mx-2 text-stone-400" />
                <span className="text-sm font-extrabold text-brand-600">{ba.after}</span>
                {ba.after > ba.before && <Badge color="green" >+{ba.after - ba.before}</Badge>}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center mt-4">
            <ProgressRing value={data.combined} max={campaign.target} size={140} label={`${pct(data.combined, campaign.target)}%`} sublabel={`${data.combined}/${campaign.target}`} />
          </div>
        </Section>

        <Section title="Growth Analytics">
          <p className="text-sm text-stone-600">Combined audience growth: {data.firstCombined} → {data.combined} ({data.growthPct >= 0 ? '+' : ''}{data.growthPct}%)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <ReportStat label="Total reach" value={sumMetric(dailyMetrics, 'Reach')} />
            <ReportStat label="Impressions" value={sumMetric(dailyMetrics, 'Impressions')} />
            <ReportStat label="Engagement" value={sumMetric(dailyMetrics, 'Engagement') + sumMetric(dailyMetrics, 'Likes') + sumMetric(dailyMetrics, 'Comments')} />
            <ReportStat label="Website clicks" value={sumMetric(dailyMetrics, 'Link clicks') + sumMetric(dailyMetrics, 'Social clicks')} />
          </div>
        </Section>

        <Section title="Key Findings & Recommendations">
          <p className="text-sm text-stone-600">{data.combined >= campaign.target ? 'Campaign target reached. ' : `${campaign.target - data.combined} more audience members needed to reach target. `}Continue creating consistent, beginner-friendly AI content across all platforms.</p>
        </Section>

        <Section title="Future Plan">
          <p className="text-sm text-stone-600">Expand to YouTube Shorts, increase posting frequency, host community live sessions, and launch advanced AI tutorial series.</p>
        </Section>
      </div>

      {/* Export actions */}
      <div className="flex gap-2 flex-wrap no-print">
        <button onClick={print} className="btn-secondary"><Printer size={16} /> Print to PDF</button>
        <button onClick={exportAnalytics} className="btn-ghost"><Download size={16} /> Analytics CSV</button>
        <button onClick={exportContent} className="btn-ghost"><Download size={16} /> Content CSV</button>
        <button onClick={exportTasks} className="btn-ghost"><Download size={16} /> Tasks CSV</button>
      </div>

      {presenting && <PresentationMode slides={buildSlides(campaign, profile?.full_name ?? 'Waqar Ahmed', data, beforeAfter, links, dailyMetrics)} onClose={() => setPresenting(false)} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="eyebrow text-charcoal-950 mb-2 border-l-4 border-l-brand-500 pl-2">{title}</h3>{children}</div>;
}
function ReportStat({ label, value }: { label: string; value: number }) {
  return <div className="bg-ivory-50 rounded-xl p-3 text-center"><p className="stat-value text-xl">{value}</p><p className="stat-label mt-0.5">{label}</p></div>;
}

function buildSlides(campaign: any, ownerName: string, data: any, beforeAfter: any[], links: any[], metrics: any[]) {
  return [
    { title: 'Project Overview', body: <><p className="text-lg">AI Learner Hub — GrowthOS</p><p className="text-sm text-stone-600 mt-2">Plan. Create. Publish. Measure. Grow.</p><p className="text-sm text-stone-600 mt-2">Owner: {ownerName} • Partner: {campaign.partner_name}</p></> },
    { title: 'Campaign Objective', body: <p className="text-lg">Reach {campaign.target} combined genuine followers and members by {formatDate(campaign.deadline)}</p> },
    { title: 'Platforms', body: <ul className="text-lg space-y-2">{links.map((l) => <li key={l.id}>{l.label}</li>)}</ul> },
    { title: 'Content Strategy', body: <div className="grid grid-cols-2 gap-4 text-lg"><div>Reels: {data.reels}</div><div>Carousels: {data.carousels}</div><div>Static: {data.statics}</div><div>Tutorials: {data.tutorials}</div></div> },
    { title: 'Execution Plan', body: <p className="text-lg">{data.completed} tasks completed<br />{data.published} posts published</p> },
    { title: 'Before vs After', body: <div className="space-y-2">{beforeAfter.map((ba) => <div key={ba.label} className="text-lg">{ba.label}: {ba.before} → {ba.after}</div>)}</div> },
    { title: 'Growth Analytics', body: <div className="flex items-center justify-center"><ProgressRing value={data.combined} max={campaign.target} size={200} label={`${pct(data.combined, campaign.target)}%`} sublabel={`${data.combined}/${campaign.target}`} /></div> },
    { title: 'Best-Performing Content', body: <p className="text-lg">Based on entered performance data</p> },
    { title: 'Challenges & Solutions', body: <p className="text-lg">Consistent content output and manual analytics tracking</p> },
    { title: 'Final Result', body: <p className="text-lg">{data.combined} / {campaign.target} combined audience<br />Growth: {data.growthPct >= 0 ? '+' : ''}{data.growthPct}%</p> },
    { title: 'Future Roadmap', body: <p className="text-lg">YouTube Shorts • Live sessions • Advanced tutorials</p> },
  ];
}

function PresentationMode({ slides, onClose }: { slides: { title: string; body: React.ReactNode }[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const slide = slides[idx];
  return (
    <div className="fixed inset-0 z-[60] bg-charcoal-950 text-ivory-50 flex flex-col">
      <div className="flex items-center justify-between p-4 no-print">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="" className="w-8 h-8 rounded-lg object-contain" />
          <span className="font-display tracking-tight">AI Learner Hub — GrowthOS</span>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition"><X size={20} /></button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center" onClick={() => setIdx((i) => (i + 1) % slides.length)}>
        <p className="eyebrow text-brand-300 mb-2">Slide {idx + 1} of {slides.length}</p>
        <h2 className="text-3xl sm:text-5xl font-display mb-6 tracking-tight">{slide.title}</h2>
        <div className="text-ivory-100 max-w-2xl">{slide.body}</div>
      </div>
      <div className="flex items-center justify-between p-4 no-print">
        <button onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold">Previous</button>
        <div className="flex gap-1">{slides.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full ${i === idx ? 'bg-brand-500' : 'bg-white/30'}`} />)}</div>
        <button onClick={() => setIdx((i) => (i + 1) % slides.length)} className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-sm font-semibold">Next</button>
      </div>
    </div>
  );
}
