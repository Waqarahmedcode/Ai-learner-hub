import { useMemo, useState } from 'react';
import { Plus, Search, Copy, Trash2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCampaign } from '@/lib/campaign';
import { useCampaignData, logActivity } from '@/lib/data';
import { useToast } from '@/lib/toast';
import { PLATFORMS, FORMATS, PRIORITIES, TASK_STATUSES, ASSIGNEES } from '@/lib/constants';
import { isOverdue, isToday, taskSortOrder, formatDate, formatTimeOfDay, cn } from '@/lib/utils';
import { Modal } from '@/components/Modal';
import { Badge, EmptyState, Loading } from '@/components/ui';
import type { Task } from '@/lib/types';

export function TodayScreen() {
  const { campaign, members } = useCampaign();
  const { user, isOwner } = useAuth();
  const { tasks, content, loading, reload } = useCampaignData();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterAssignee, setFilterAssignee] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<Partial<Task>>({});

  const memberName = (uid: string | null) => {
    if (!uid) return 'Unassigned';
    const m = members.find((mm) => mm.user_id === uid);
    return m?.profile?.full_name ?? 'Team member';
  };

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', description: '', platform: 'General Project', content_format: 'General', priority: 'Medium', status: 'Not Started', due_date: new Date().toISOString().slice(0, 10), due_time: '09:00', assigned_to: user?.id ?? null, notes: '' });
    setModalOpen(true);
  };
  const openEdit = (t: Task) => { setEditing(t); setForm(t); setModalOpen(true); };

  const save = async () => {
    if (!campaign || !user) return;
    if (!form.title?.trim()) { toast('Task title is required', 'error'); return; }
    if (editing) {
      const { error } = await supabase.from('tasks').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing.id);
      if (error) { toast('Could not update task', 'error'); return; }
      await logActivity(campaign.id, user.id, 'updated a task', form.title);
    } else {
      const { error } = await supabase.from('tasks').insert({ ...form, campaign_id: campaign.id, created_by: user.id });
      if (error) { toast('Could not create task', 'error'); return; }
      await logActivity(campaign.id, user.id, 'created a task', form.title);
    }
    toast(editing ? 'Task updated' : 'Task created');
    setModalOpen(false);
    reload();
  };

  const complete = async (t: Task) => {
    if (!campaign || !user) return;
    await supabase.from('tasks').update({ status: 'Completed', updated_at: new Date().toISOString() }).eq('id', t.id);
    await logActivity(campaign.id, user.id, 'completed a task', t.title);
    toast('Task completed');
    reload();
  };

  const duplicate = async (t: Task) => {
    if (!campaign || !user) return;
    const { id, created_at, updated_at, ...rest } = t;
    void id; void created_at; void updated_at;
    await supabase.from('tasks').insert({ ...rest, title: `${t.title} (copy)`, campaign_id: campaign.id, created_by: user.id, status: 'Not Started' });
    await logActivity(campaign.id, user.id, 'duplicated a task', t.title);
    toast('Task duplicated');
    reload();
  };

  const remove = async (t: Task) => {
    if (!isOwner) { toast('Only the Owner can delete tasks', 'error'); return; }
    if (!confirm(`Delete "${t.title}"?`)) return;
    await supabase.from('tasks').delete().eq('id', t.id);
    toast('Task deleted');
    reload();
  };

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => {
      if (search && !`${t.title} ${t.description}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== 'All' && t.status !== filterStatus) return false;
      if (filterPriority !== 'All' && t.priority !== filterPriority) return false;
      if (filterAssignee !== 'All' && memberName(t.assigned_to) !== filterAssignee) return false;
      return true;
    });
    list = list.sort((a, b) => taskSortOrder(a) - taskSortOrder(b));
    return list;
  }, [tasks, search, filterStatus, filterPriority, filterAssignee, members]);

  if (loading) return <Loading label="Loading tasks…" />;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter((t) => t.due_date === todayStr);
  const completedToday = todayTasks.filter((t) => t.status === 'Completed').length;
  const overdueCount = tasks.filter((t) => isOverdue(t)).length;
  const ownerCount = tasks.filter((t) => t.assigned_to === campaign?.owner_id).length;
  const partnerCount = tasks.length - ownerCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">What should we do next?</h2>
          <p className="text-xs text-stone-500">Sorted by urgency and priority</p>
        </div>
        <button onClick={openNew} className="btn-primary !py-2.5"><Plus size={16} /> Add Task</button>
      </div>

      {/* Progress strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card !p-3.5">
          <p className="stat-value text-lg">{completedToday}/{todayTasks.length}</p>
          <p className="stat-label mt-0.5">Today completed</p>
        </div>
        <div className="card !p-3.5">
          <p className="stat-value text-lg">{ownerCount}</p>
          <p className="stat-label mt-0.5">Owner tasks</p>
        </div>
        <div className="card !p-3.5">
          <p className="stat-value text-lg">{partnerCount}</p>
          <p className="stat-label mt-0.5">Partner tasks</p>
        </div>
        <div className={`card !p-3.5 ${overdueCount > 0 ? 'bg-red-50 ring-1 ring-red-100' : ''}`}>
          <p className={`stat-value text-lg ${overdueCount > 0 ? 'text-red-600' : ''}`}>{overdueCount}</p>
          <p className="stat-label mt-0.5">Overdue</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input className="input pl-9" placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="input !py-2 !w-auto text-xs" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option>All</option>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select className="input !py-2 !w-auto text-xs" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option>All</option>{TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="input !py-2 !w-auto text-xs" value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
            <option>All</option>{ASSIGNEES.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Clock size={32} />} title="No tasks here" description="Create your first task to get organized." action={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Add Task</button>} />
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const overdue = isOverdue(t);
            const today = isToday(t.due_date);
            return (
              <div key={t.id} className={cn('card card-hover !p-3.5', overdue && 'border-l-[3px] border-l-red-400', today && !overdue && 'border-l-[3px] border-l-brand-400')}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => complete(t)}
                    disabled={t.status === 'Completed'}
                    className={cn('mt-0.5 shrink-0 transition-colors', t.status === 'Completed' ? 'text-emerald-500' : 'text-stone-300 hover:text-brand-500')}
                    title="Mark complete"
                  >
                    <CheckCircle2 size={22} />
                  </button>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(t)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn('text-sm font-semibold', t.status === 'Completed' ? 'text-stone-400 line-through' : 'text-charcoal-950')}>{t.title}</p>
                      {overdue && <Badge color="red"><AlertTriangle size={10} /> Overdue</Badge>}
                    </div>
                    {t.description && <p className="text-xs text-stone-500 mt-1 line-clamp-2">{t.description}</p>}
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <Badge color="neutral">{memberName(t.assigned_to)}</Badge>
                      <Badge color="brand">{t.platform}</Badge>
                      <Badge color="purple">{t.content_format}</Badge>
                      <Badge color={t.priority === 'Critical' ? 'red' : t.priority === 'High' ? 'amber' : 'neutral'}>{t.priority}</Badge>
                      <Badge color={t.status === 'Completed' ? 'green' : 'blue'}>{t.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-stone-500">
                      <span>{formatDate(t.due_date)}</span>
                      {t.due_time && <span>{formatTimeOfDay(t.due_time)}</span>}
                      {t.content_id && <span>Linked content</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => duplicate(t)} className="p-1.5 rounded-lg hover:bg-ivory-100 text-stone-400" title="Duplicate"><Copy size={14} /></button>
                    {isOwner && <button onClick={() => remove(t)} className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500" title="Delete"><Trash2 size={14} /></button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Task' : 'New Task'}>
        <div className="space-y-3">
          <div><label className="label">Title</label><input className="input" value={form.title ?? ''} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
          <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Assign to</label>
              <select className="input" value={form.assigned_to ?? ''} onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value || null }))}>
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.profile?.full_name ?? 'Member'}</option>)}
              </select>
            </div>
            <div><label className="label">Platform</label>
              <select className="input" value={form.platform ?? ''} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}>
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Format</label>
              <select className="input" value={form.content_format ?? ''} onChange={(e) => setForm((f) => ({ ...f, content_format: e.target.value }))}>
                {FORMATS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label className="label">Priority</label>
              <select className="input" value={form.priority ?? ''} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Due date</label><input className="input" type="date" value={form.due_date ?? ''} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} /></div>
            <div><label className="label">Due time</label><input className="input" type="time" value={form.due_time ?? ''} onChange={(e) => setForm((f) => ({ ...f, due_time: e.target.value }))} /></div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status ?? ''} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label className="label">Link to content (optional)</label>
            <select className="input" value={form.content_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, content_id: e.target.value || null }))}>
              <option value="">None</option>
              {content.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          <button onClick={save} className="btn-primary w-full">{editing ? 'Save Changes' : 'Create Task'}</button>
        </div>
      </Modal>
    </div>
  );
}
