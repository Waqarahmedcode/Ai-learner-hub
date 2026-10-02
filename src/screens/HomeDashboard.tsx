import { useEffect, useState } from 'react';
import { Link2, Copy, ExternalLink, AlertTriangle, Plus, BarChart3, CalendarPlus, CheckSquare, FileText, TrendingUp, Users, Eye, MousePointerClick, ThumbsUp } from 'lucide-react';
import { useCampaign } from '@/lib/campaign';
import { useCampaignData, getLatestMetric, sumMetric, latestCombinedAudience } from '@/lib/data';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { countdown, pct, copyToClipboard, isToday, isOverdue, formatTime } from '@/lib/utils';
import { ProgressRing, ProgressBar, Loading, EmptyState } from '@/components/ui';
import type { ScreenKey } from '@/components/nav';

export function HomeDashboard({ onNavigate }: { onNavigate: (s: ScreenKey) => void }) {
  const { campaign, links } = useCampaign();
  const { tasks, content, dailyMetrics, contentMetrics, loading, reload } = useCampaignData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);
  void tick;

  if (loading) return <Loading label="Loading dashboard…" />;
  if (!campaign) return <EmptyState title="No campaign found" description="Complete onboarding to begin." />;

  const cd = countdown(campaign.deadline);
  const combined = latestCombinedAudience(dailyMetrics);
  const target = campaign.target;
  const remaining = Math.max(0, target - combined);
  const percent = pct(combined, target);
  const perDay = cd.days > 0 ? Math.ceil(remaining / cd.days) : remaining;
  const perHour = cd.total > 0 ? Math.ceil(remaining / (cd.total / 3600000)) : 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter((t) => t.due_date === todayStr);
  const completedToday = todayTasks.filter((t) => t.status === 'Completed').length;
  const remainingToday = todayTasks.length - completedToday;

  const readyContent = content.filter((c) => c.status === 'Approved').length;
  const scheduledContent = content.filter((c) => c.status === 'Scheduled').length;
  const publishedContent = content.filter((c) => c.status === 'Published' || c.status === 'Results Added').length;

  const totalReach = sumMetric(dailyMetrics, 'Reach');
  const totalImpressions = sumMetric(dailyMetrics, 'Impressions');
  const totalEngagement = sumMetric(dailyMetrics, 'Engagement') + sumMetric(dailyMetrics, 'Likes') + sumMetric(dailyMetrics, 'Comments') + sumMetric(dailyMetrics, 'Shares') + sumMetric(dailyMetrics, 'Reactions');
  const websiteClicks = getLatestMetric(dailyMetrics, 'Website', 'Social clicks') + sumMetric(dailyMetrics, 'Link clicks');

  const fbFollowers = getLatestMetric(dailyMetrics, 'Facebook Page', 'Followers');
  const fbReach = getLatestMetric(dailyMetrics, 'Facebook Page', 'Reach');
  const fbImpressions = sumMetric(dailyMetrics.filter((m) => m.platform === 'Facebook Page'), 'Impressions');
  const fbEngagement = getLatestMetric(dailyMetrics, 'Facebook Page', 'Engagement');

  const groupMembers = getLatestMetric(dailyMetrics, 'Facebook Group', 'Members');
  const groupNew = getLatestMetric(dailyMetrics, 'Facebook Group', 'New members');
  const groupActive = getLatestMetric(dailyMetrics, 'Facebook Group', 'Active members');
  const groupEngagement = getLatestMetric(dailyMetrics, 'Facebook Group', 'Engagement');

  const igFollowers = getLatestMetric(dailyMetrics, 'Instagram', 'Followers');
  const igReach = getLatestMetric(dailyMetrics, 'Instagram', 'Reach');
  const igImpressions = sumMetric(dailyMetrics.filter((m) => m.platform === 'Instagram'), 'Impressions');
  const igProfileVisits = getLatestMetric(dailyMetrics, 'Instagram', 'Profile visits');

  const webVisitors = getLatestMetric(dailyMetrics, 'Website', 'Visitors');
  const webPageViews = getLatestMetric(dailyMetrics, 'Website', 'Page views');
  const webReferral = getLatestMetric(dailyMetrics, 'Website', 'Referral source');

  const attention: { text: string; color: string }[] = [];
  const overdueTasks = tasks.filter((t) => isOverdue(t));
  if (overdueTasks.length > 0) attention.push({ text: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`, color: 'red' });
  const dueToday = tasks.filter((t) => isToday(t.due_date) && t.status !== 'Completed');
  if (dueToday.length > 0) attention.push({ text: `${dueToday.length} task${dueToday.length > 1 ? 's' : ''} due today`, color: 'amber' });
  const waitingApproval = content.filter((c) => c.status === 'Ready for Review' || c.status === 'Changes Required');
  if (waitingApproval.length > 0) attention.push({ text: `${waitingApproval.length} content item${waitingApproval.length > 1 ? 's' : ''} waiting for review`, color: 'brand' });
  if (dailyMetrics.length === 0) attention.push({ text: 'No analytics entered yet', color: 'amber' });
  const publishedWithoutResults = content.filter((c) => c.status === 'Published' && !contentMetrics.some((cm) => cm.content_id === c.id));
  if (publishedWithoutResults.length > 0) attention.push({ text: `${publishedWithoutResults.length} published post${publishedWithoutResults.length > 1 ? 's' : ''} without result data`, color: 'amber' });
  if (remaining > 0) attention.push({ text: `${remaining} more audience members needed to reach target`, color: 'brand' });
  const noAssets = content.filter((c) => !c.asset_url && c.status !== 'Idea' && c.status !== 'Research');
  if (noAssets.length > 0) attention.push({ text: `${noAssets.length} content item${noAssets.length > 1 ? 's' : ''} without assets`, color: 'amber' });

  const copyLink = async (url: string, label: string) => {
    await copyToClipboard(url);
    toast(`Copied ${label} link`, 'success');
  };

  const quickActions = [
    { label: 'Generate Content', icon: FileText, screen: 'studio' as ScreenKey },
    { label: 'Add Task', icon: Plus, screen: 'today' as ScreenKey },
    { label: 'Enter Analytics', icon: BarChart3, screen: 'analytics' as ScreenKey },
    { label: 'Add Published Post', icon: CalendarPlus, screen: 'library' as ScreenKey },
    { label: "View Today's Plan", icon: CheckSquare, screen: 'today' as ScreenKey },
    { label: 'Open Official Links', icon: Link2, screen: 'settings' as ScreenKey },
  ];

  return (
    <div className="space-y-5">
      {/* Countdown hero */}
      <div className="card-elev !p-0 bg-charcoal-950 text-ivory-50 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-brand-500/25 rounded-full blur-[100px]" />
        <div className="absolute -bottom-20 -left-10 w-56 h-56 bg-accent-purple/15 rounded-full blur-[100px]" />
        <div className="relative p-5 sm:p-6">
          <p className="eyebrow text-brand-300">Campaign</p>
          <h2 className="text-2xl font-display mt-1.5 tracking-tight">{campaign.name}</h2>
          <div className="grid grid-cols-4 gap-2 mt-5">
            {[
              { v: cd.days, l: 'Days' },
              { v: cd.hours, l: 'Hours' },
              { v: cd.minutes, l: 'Mins' },
              { v: cd.seconds, l: 'Secs' },
            ].map((x) => (
              <div key={x.l} className="bg-white/[0.07] ring-1 ring-white/10 rounded-xl py-2.5 text-center">
                <p className="text-2xl font-mono font-bold tabular-nums">{String(x.v).padStart(2, '0')}</p>
                <p className="text-[10px] text-ivory-200/60 font-mono uppercase tracking-wider mt-0.5">{x.l}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-ivory-200/60 mt-4">Deadline: {new Date(campaign.deadline).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })} • {campaign.timezone}</p>
        </div>
      </div>

      {/* Progress ring + key numbers */}
      <div className="card flex flex-col items-center">
        <ProgressRing value={combined} max={target} label={`${percent}%`} sublabel={`${combined} / ${target}`} />
        <p className="text-sm font-semibold text-charcoal-950 mt-3">Combined Audience</p>
        <p className="text-xs text-stone-500">Followers + Group members</p>
        <div className="grid grid-cols-3 gap-3 w-full mt-4 text-center">
          <div className="bg-ivory-50 rounded-xl py-2.5">
            <p className="stat-value text-lg">{remaining}</p>
            <p className="stat-label mt-0.5">Remaining</p>
          </div>
          <div className="bg-ivory-50 rounded-xl py-2.5">
            <p className="stat-value text-lg text-brand-600">{perDay}</p>
            <p className="stat-label mt-0.5">Per day</p>
          </div>
          <div className="bg-ivory-50 rounded-xl py-2.5">
            <p className="stat-value text-lg text-brand-600">{perHour}</p>
            <p className="stat-label mt-0.5">Per hour</p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: CheckSquare, label: 'Tasks today', value: `${completedToday}/${todayTasks.length}`, color: 'text-brand-600', bg: 'bg-brand-50' },
          { icon: FileText, label: 'Content ready', value: readyContent, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: CalendarPlus, label: 'Scheduled', value: scheduledContent, color: 'text-violet-600', bg: 'bg-violet-50' },
          { icon: TrendingUp, label: 'Published', value: publishedContent, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card card-hover !p-3.5">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}><Icon size={16} className={s.color} /></div>
              <p className="stat-value text-xl mt-2.5">{s.value}</p>
              <p className="stat-label mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Reach / Impressions / Engagement / Clicks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Eye, label: 'Total reach', value: totalReach },
          { icon: TrendingUp, label: 'Impressions', value: totalImpressions },
          { icon: ThumbsUp, label: 'Engagement', value: totalEngagement },
          { icon: MousePointerClick, label: 'Website clicks', value: websiteClicks },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card card-hover !p-3.5">
              <Icon size={16} className="text-stone-400" />
              <p className="stat-value text-lg mt-2.5">{s.value.toLocaleString()}</p>
              <p className="stat-label mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PlatformCard title="Facebook Page" link={links.find((l) => l.label === 'Facebook Page')?.url} onCopy={copyLink} stats={[
          { label: 'Followers', value: fbFollowers },
          { label: 'Reach', value: fbReach },
          { label: 'Impressions', value: fbImpressions },
          { label: 'Engagement', value: fbEngagement },
        ]} />
        <PlatformCard title="Facebook Group" link={links.find((l) => l.label === 'Facebook Group')?.url} onCopy={copyLink} stats={[
          { label: 'Members', value: groupMembers },
          { label: 'New members', value: groupNew },
          { label: 'Active members', value: groupActive },
          { label: 'Engagement', value: groupEngagement },
        ]} />
        <PlatformCard title="Instagram" link={links.find((l) => l.label === 'Instagram')?.url} onCopy={copyLink} stats={[
          { label: 'Followers', value: igFollowers },
          { label: 'Reach', value: igReach },
          { label: 'Impressions', value: igImpressions },
          { label: 'Profile visits', value: igProfileVisits },
        ]} />
        <PlatformCard title="Website" link={links.find((l) => l.label === 'Website')?.url} onCopy={copyLink} stats={[
          { label: 'Visitors', value: webVisitors },
          { label: 'Page views', value: webPageViews },
          { label: 'Referral clicks', value: webReferral },
        ]} />
      </div>

      {/* What needs attention */}
      <div className="card-elev">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center"><AlertTriangle size={16} className="text-brand-500" /></div>
          <h3 className="section-title !text-lg">What needs attention?</h3>
        </div>
        {attention.length === 0 ? (
          <p className="text-sm text-stone-500">Everything looks on track. Great work!</p>
        ) : (
          <ul className="space-y-2">
            {attention.map((a, i) => (
              <li key={i} className={`text-sm rounded-xl px-3 py-2.5 ring-1 ring-inset ${
                a.color === 'red' ? 'bg-red-50 text-red-700 ring-red-100' :
                a.color === 'amber' ? 'bg-amber-50 text-amber-800 ring-amber-100' :
                'bg-brand-50 text-brand-700 ring-brand-100'
              }`}>{a.text}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick actions */}
      <div className="card-elev">
        <h3 className="section-title !text-lg mb-3">Quick actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <button key={a.label} onClick={() => onNavigate(a.screen)} className="flex flex-col items-center gap-2 bg-ivory-50 hover:bg-brand-50 ring-1 ring-transparent hover:ring-brand-100 rounded-xl py-4 transition-all duration-200 group">
                <Icon size={22} className="text-brand-500 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-semibold text-charcoal-900 text-center">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick links */}
      <div className="card-elev">
        <h3 className="section-title !text-lg mb-3">Official Quick Links</h3>
        <div className="space-y-2">
          {links.map((link) => (
            <div key={link.id} className="flex items-center gap-2 bg-ivory-50 rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal-900">{link.label}</p>
                <p className="text-xs text-stone-500 truncate">{link.url}</p>
              </div>
              <button onClick={() => copyLink(link.url, link.label)} className="p-2 rounded-lg hover:bg-white text-stone-500 transition" title="Copy link">
                <Copy size={16} />
              </button>
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white text-brand-600 transition" title="Open">
                <ExternalLink size={16} />
              </a>
            </div>
          ))}
        </div>
      </div>

      {user && <button onClick={reload} className="hidden">reload</button>}
    </div>
  );
}

function PlatformCard({ title, link, stats, onCopy }: {
  title: string;
  link?: string;
  stats: { label: string; value: number }[];
  onCopy: (url: string, label: string) => void;
}) {
  return (
    <div className="card card-hover">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-charcoal-950">{title}</h4>
        {link && (
          <div className="flex gap-1">
            <button onClick={() => onCopy(link, title)} className="p-1.5 rounded-lg hover:bg-ivory-100 text-stone-500 transition"><Copy size={14} /></button>
            <a href={link} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-ivory-100 text-brand-600 transition"><ExternalLink size={14} /></a>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="bg-ivory-50 rounded-xl py-2.5 px-3">
            <p className="stat-value text-lg">{s.value.toLocaleString()}</p>
            <p className="stat-label mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
