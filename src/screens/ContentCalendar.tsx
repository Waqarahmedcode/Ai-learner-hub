import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCampaign } from '@/lib/campaign';
import { useCampaignData, logActivity } from '@/lib/data';
import { useToast } from '@/lib/toast';
import { PLATFORMS } from '@/lib/constants';
import { formatTime, formatDate, cn } from '@/lib/utils';
import { Modal } from '@/components/Modal';
import { Badge, EmptyState, Loading } from '@/components/ui';
import { Calendar as CalIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarEntry } from '@/lib/types';

type View = 'day' | 'week' | 'campaign';

export function ContentCalendar() {
  const { campaign, members } = useCampaign();
  const { user } = useAuth();
  const { calendar, content, loading, reload } = useCampaignData();
  const { toast } = useToast();
  const [view, setView] = useState<View>('week');
  const [refDate, setRefDate] = useState(new Date());
  const [filter, setFilter] = useState<string>('All');
  const [editEntry, setEditEntry] = useState<CalendarEntry | null>(null);
  const [editDate, setEditDate] = useState<string>('');

  const memberName = (uid: string | null) => members.find((m) => m.user_id === uid)?.profile?.full_name ?? 'Unassigned';

  const filters = ['All', 'Facebook Page', 'Facebook Group', 'Instagram', 'Website', 'YouTube Shorts', 'Published', 'Pending', 'Waqar Ahmed', 'Sadia'];

  const filteredEntries = useMemo(() => {
    return calendar.filter((e) => {
      if (filter === 'All') return true;
      if (['Facebook Page', 'Facebook Group', 'Instagram', 'Website', 'YouTube Shorts'].includes(filter)) return e.platform === filter;
      if (filter === 'Published') return e.status === 'Published';
      if (filter === 'Pending') return e.status !== 'Published';
      if (filter === 'Waqar Ahmed' || filter === 'Sadia') return memberName(e.assigned_to) === filter;
      return true;
    });
  }, [calendar, filter, members]);

  const weekDays = useMemo(() => {
    const start = new Date(refDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [refDate]);

  const entriesForDate = (d: Date) => filteredEntries.filter((e) => new Date(e.scheduled_at).toDateString() === d.toDateString()).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  const shift = (n: number) => { const d = new Date(refDate); d.setDate(d.getDate() + n); setRefDate(d); };

  const reschedule = async (entry: CalendarEntry, newDate: string) => {
    if (!user) return;
    const orig = new Date(entry.scheduled_at);
    const [h, m] = [orig.getHours(), orig.getMinutes()];
    const nd = new Date(newDate); nd.setHours(h, m);
    await supabase.from('calendar_entries').update({ scheduled_at: nd.toISOString() }).eq('id', entry.id);
    if (campaign) await logActivity(campaign.id, user.id, 'rescheduled a calendar entry', entry.title);
    toast('Rescheduled');
    setEditEntry(null);
    reload();
  };

  if (loading) return <Loading label="Loading calendar…" />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="section-title">Content Calendar</h2>
        <p className="text-xs text-stone-500">Scheduled content by platform and date</p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex bg-ivory-100 rounded-xl p-1">
          {(['day', 'week', 'campaign'] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition', view === v ? 'bg-white text-charcoal-900 shadow-soft' : 'text-stone-500')}>{v}</button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => shift(view === 'day' ? -1 : -7)} className="p-2 rounded-lg hover:bg-ivory-100"><ChevronLeft size={18} /></button>
          <span className="text-xs font-semibold text-charcoal-900 min-w-[120px] text-center">{view === 'day' ? formatDate(refDate.toISOString()) : `${formatDate(weekDays[0].toISOString())} – ${formatDate(weekDays[6].toISOString())}`}</span>
          <button onClick={() => shift(view === 'day' ? 1 : 7)} className="p-2 rounded-lg hover:bg-ivory-100"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('chip transition', filter === f ? 'bg-brand-500 text-white' : 'bg-ivory-100 text-charcoal-800')}>{f}</button>
        ))}
      </div>

      {view === 'day' && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-charcoal-900">{formatDate(refDate.toISOString())}</p>
          {entriesForDate(refDate).length === 0 ? (
            <EmptyState icon={<CalIcon size={28} />} title="Nothing scheduled" description="Schedule content from the Library or Studio." />
          ) : (
            entriesForDate(refDate).map((e) => <CalendarCard key={e.id} entry={e} assignee={memberName(e.assigned_to)} onEdit={() => { setEditEntry(e); setEditDate(e.scheduled_at.slice(0, 10)); }} />)
          )}
        </div>
      )}

      {view === 'week' && (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
          {weekDays.map((d) => {
            const entries = entriesForDate(d);
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <div key={d.toISOString()} className={cn('card !p-2 min-h-[100px]', isToday && 'ring-2 ring-brand-300')}>
                <p className={cn('text-[11px] font-bold mb-1', isToday ? 'text-brand-600' : 'text-stone-500')}>{d.toLocaleDateString('en-US', { weekday: 'short' })} {d.getDate()}</p>
                <div className="space-y-1">
                  {entries.slice(0, 3).map((e) => (
                    <div key={e.id} className="bg-ivory-50 rounded-lg p-1.5 cursor-pointer hover:bg-brand-50" onClick={() => { setEditEntry(e); setEditDate(e.scheduled_at.slice(0, 10)); }}>
                      <p className="text-[10px] font-semibold text-charcoal-900 truncate">{e.title}</p>
                      <p className="text-[9px] text-stone-500">{formatTime(e.scheduled_at)} • {e.platform}</p>
                    </div>
                  ))}
                  {entries.length > 3 && <p className="text-[9px] text-stone-400">+{entries.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'campaign' && (
        <div className="space-y-2">
          {filteredEntries.length === 0 ? (
            <EmptyState icon={<CalIcon size={28} />} title="No scheduled entries" description="Schedule content to see it here." />
          ) : (
            filteredEntries.map((e) => <CalendarCard key={e.id} entry={e} assignee={memberName(e.assigned_to)} onEdit={() => { setEditEntry(e); setEditDate(e.scheduled_at.slice(0, 10)); }} />)
          )}
        </div>
      )}

      <Modal open={!!editEntry} onClose={() => setEditEntry(null)} title="Reschedule Entry" size="sm">
        {editEntry && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-charcoal-900">{editEntry.title}</p>
              <p className="text-xs text-stone-500">{editEntry.platform} • {formatTime(editEntry.scheduled_at)}</p>
            </div>
            <div><label className="label">New date</label><input className="input" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} /></div>
            <button onClick={() => reschedule(editEntry, editDate)} className="btn-primary w-full">Reschedule</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CalendarCard({ entry, assignee, onEdit }: { entry: CalendarEntry; assignee: string; onEdit: () => void }) {
  return (
    <div className="card !p-3 cursor-pointer hover:shadow-card transition" onClick={onEdit}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-brand-600">{formatTime(entry.scheduled_at)}</span>
        <Badge color={entry.status === 'Published' ? 'green' : 'amber'}>{entry.status}</Badge>
      </div>
      <p className="text-sm font-semibold text-charcoal-900 mt-1">{entry.title}</p>
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
        <Badge color="brand">{entry.platform}</Badge>
        <Badge color="purple">{entry.format}</Badge>
        <Badge color="neutral">{assignee}</Badge>
      </div>
    </div>
  );
}
