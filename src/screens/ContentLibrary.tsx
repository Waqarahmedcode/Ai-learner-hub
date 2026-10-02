import { useMemo, useState } from 'react';
import { Plus, Search, Copy, Trash2, ExternalLink, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCampaign } from '@/lib/campaign';
import { useCampaignData, logActivity } from '@/lib/data';
import { useToast } from '@/lib/toast';
import { CONTENT_PLATFORMS, FORMATS, CONTENT_STATUSES, ASSIGNEES, CONTENT_PERFORMANCE_METRICS } from '@/lib/constants';
import { formatDate, cn } from '@/lib/utils';
import { Modal } from '@/components/Modal';
import { Badge, EmptyState, Loading } from '@/components/ui';
import type { ContentItem } from '@/lib/types';

export function ContentLibrary() {
  const { campaign, members } = useCampaign();
  const { user, isOwner } = useAuth();
  const { content, contentMetrics, loading, reload } = useCampaignData();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPlatform, setFilterPlatform] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [perfModal, setPerfModal] = useState<ContentItem | null>(null);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [form, setForm] = useState<Partial<ContentItem>>({});
  const [perfData, setPerfData] = useState<Record<string, string>>({});

  const memberName = (uid: string | null) => {
    if (!uid) return 'Unassigned';
    return members.find((m) => m.user_id === uid)?.profile?.full_name ?? 'Team member';
  };

  const openNew = () => { setEditing(null); setForm({ title: '', topic: '', platform: 'Instagram', format: 'Static Post', status: 'Idea', hook: '', script: '', caption: '', cta: '', notes: '' }); setModalOpen(true); };
  const openEdit = (c: ContentItem) => { setEditing(c); setForm(c); setModalOpen(true); };

  const save = async () => {
    if (!campaign || !user) return;
    if (!form.title?.trim()) { toast('Title is required', 'error'); return; }
    if (editing) {
      const { id, created_at, updated_at, ...rest } = editing;
      void id; void created_at; void updated_at;
      const { error } = await supabase.from('content_items').update({ ...rest, ...form, updated_at: new Date().toISOString() }).eq('id', editing.id);
      if (error) { toast('Could not update content', 'error'); return; }
      await logActivity(campaign.id, user.id, 'updated a content item', form.title);
    } else {
      const { error } = await supabase.from('content_items').insert({ ...form, campaign_id: campaign.id, created_by: user.id });
      if (error) { toast('Could not create content', 'error'); return; }
      await logActivity(campaign.id, user.id, 'created a content item', form.title);
    }
    toast(editing ? 'Content updated' : 'Content created');
    setModalOpen(false);
    reload();
  };

  const duplicate = async (c: ContentItem) => {
    if (!campaign || !user) return;
    const { id, created_at, updated_at, ...rest } = c;
    void id; void created_at; void updated_at;
    await supabase.from('content_items').insert({ ...rest, title: `${c.title} (copy)`, campaign_id: campaign.id, created_by: user.id, status: 'Idea' });
    toast('Content duplicated');
    reload();
  };

  const remove = async (c: ContentItem) => {
    if (!isOwner) { toast('Only the Owner can delete content', 'error'); return; }
    if (!confirm(`Delete "${c.title}"?`)) return;
    await supabase.from('content_items').delete().eq('id', c.id);
    toast('Content deleted');
    reload();
  };

  const approve = async (c: ContentItem) => {
    if (!campaign || !user) return;
    await supabase.from('content_items').update({ status: 'Approved', updated_at: new Date().toISOString() }).eq('id', c.id);
    await logActivity(campaign.id, user.id, 'approved content', c.title);
    toast('Content approved');
    reload();
  };

  const openPerf = (c: ContentItem) => {
    const existing = contentMetrics.find((cm) => cm.content_id === c.id);
    setPerfData(Object.fromEntries(CONTENT_PERFORMANCE_METRICS.map((m) => [m, String(existing?.metrics?.[m] ?? '')])));
    setPerfModal(c);
  };

  const savePerf = async () => {
    if (!campaign || !user || !perfModal) return;
    const metrics: Record<string, number> = {};
    for (const m of CONTENT_PERFORMANCE_METRICS) {
      const v = perfData[m];
      if (v !== '' && !isNaN(Number(v))) metrics[m] = Number(v);
    }
    const existing = contentMetrics.find((cm) => cm.content_id === perfModal.id);
    if (existing) {
      await supabase.from('content_metrics').update({ metrics }).eq('id', existing.id);
    } else {
      await supabase.from('content_metrics').insert({ campaign_id: campaign.id, content_id: perfModal.id, metrics, created_by: user.id });
    }
    await supabase.from('content_items').update({ status: 'Results Added', updated_at: new Date().toISOString() }).eq('id', perfModal.id);
    await logActivity(campaign.id, user.id, 'entered content performance data', perfModal.title);
    toast('Performance saved');
    setPerfModal(null);
    reload();
  };

  const filtered = useMemo(() => content.filter((c) => {
    if (search && !`${c.title} ${c.topic}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'All' && c.status !== filterStatus) return false;
    if (filterPlatform !== 'All' && c.platform !== filterPlatform) return false;
    return true;
  }), [content, search, filterStatus, filterPlatform]);

  if (loading) return <Loading label="Loading content…" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="section-title">Content Library</h2><p className="text-xs text-stone-500">{content.length} items</p></div>
        <button onClick={openNew} className="btn-primary !py-2.5"><Plus size={16} /> Add Content</button>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input className="input pl-9" placeholder="Search content…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="input !py-2 !w-auto text-xs" value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
            <option>All</option>{CONTENT_PLATFORMS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select className="input !py-2 !w-auto text-xs" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option>All</option>{CONTENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No content yet" description="Create your first content item or generate one in the Studio." action={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Add Content</button>} />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="card card-hover !p-3.5 cursor-pointer" onClick={() => openEdit(c)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-charcoal-900 truncate">{c.title}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    <Badge color="brand">{c.platform}</Badge>
                    <Badge color="purple">{c.format}</Badge>
                    <Badge color={c.status === 'Published' ? 'green' : c.status === 'Approved' ? 'blue' : 'neutral'}>{c.status}</Badge>
                    <Badge color="neutral">{memberName(c.assigned_to)}</Badge>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1.5">Created {formatDate(c.created_at)}{c.scheduled_at && ` • Sched ${formatDate(c.scheduled_at)}`}{c.published_at && ` • Published ${formatDate(c.published_at)}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-ivory-100" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => approve(c)} className="text-[11px] font-semibold text-emerald-600 px-2 py-1 rounded-lg hover:bg-emerald-50">Approve</button>
                <button onClick={() => openPerf(c)} className="text-[11px] font-semibold text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 flex items-center gap-1"><BarChart3 size={12} /> Results</button>
                {c.published_url && <a href={c.published_url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-50 flex items-center gap-1"><ExternalLink size={12} /> Post</a>}
                <button onClick={() => duplicate(c)} className="text-[11px] font-semibold text-stone-500 px-2 py-1 rounded-lg hover:bg-ivory-100 flex items-center gap-1"><Copy size={12} /> Copy</button>
                {isOwner && <button onClick={() => remove(c)} className="text-[11px] font-semibold text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 flex items-center gap-1 ml-auto"><Trash2 size={12} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Content' : 'New Content'} size="lg">
        <div className="space-y-3">
          <div><label className="label">Title</label><input className="input" value={form.title ?? ''} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Platform</label><select className="input" value={form.platform ?? ''} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}>{CONTENT_PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></div>
            <div><label className="label">Format</label><select className="input" value={form.format ?? ''} onChange={(e) => setForm((f) => ({ ...f, format: e.target.value }))}>{FORMATS.map((p) => <option key={p}>{p}</option>)}</select></div>
          </div>
          <div><label className="label">Topic</label><input className="input" value={form.topic ?? ''} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} /></div>
          <div><label className="label">Hook</label><textarea className="input" rows={2} value={form.hook ?? ''} onChange={(e) => setForm((f) => ({ ...f, hook: e.target.value }))} /></div>
          <div><label className="label">Script</label><textarea className="input" rows={3} value={form.script ?? ''} onChange={(e) => setForm((f) => ({ ...f, script: e.target.value }))} /></div>
          <div><label className="label">Caption</label><textarea className="input" rows={2} value={form.caption ?? ''} onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">CTA</label><input className="input" value={form.cta ?? ''} onChange={(e) => setForm((f) => ({ ...f, cta: e.target.value }))} /></div>
            <div><label className="label">Status</label><select className="input" value={form.status ?? ''} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>{CONTENT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div><label className="label">Assigned to</label><select className="input" value={form.assigned_to ?? ''} onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value || null }))}><option value="">Unassigned</option>{members.map((m) => <option key={m.user_id} value={m.user_id}>{m.profile?.full_name ?? 'Member'}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Scheduled date</label><input className="input" type="datetime-local" value={form.scheduled_at ? new Date(form.scheduled_at).toISOString().slice(0, 16) : ''} onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null }))} /></div>
            <div><label className="label">Published date</label><input className="input" type="datetime-local" value={form.published_at ? new Date(form.published_at).toISOString().slice(0, 16) : ''} onChange={(e) => setForm((f) => ({ ...f, published_at: e.target.value ? new Date(e.target.value).toISOString() : null }))} /></div>
          </div>
          <div><label className="label">Published URL</label><input className="input" value={form.published_url ?? ''} onChange={(e) => setForm((f) => ({ ...f, published_url: e.target.value }))} placeholder="https://…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Asset URL</label><input className="input" value={form.asset_url ?? ''} onChange={(e) => setForm((f) => ({ ...f, asset_url: e.target.value }))} /></div>
            <div><label className="label">Thumbnail URL</label><input className="input" value={form.thumbnail_url ?? ''} onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          <button onClick={save} className="btn-primary w-full">{editing ? 'Save Changes' : 'Create Content'}</button>
        </div>
      </Modal>

      <Modal open={!!perfModal} onClose={() => setPerfModal(null)} title="Content Performance">
        <div className="space-y-3">
          <p className="text-sm text-stone-500">{perfModal?.title}</p>
          <div className="grid grid-cols-2 gap-3">
            {CONTENT_PERFORMANCE_METRICS.map((m) => (
              <div key={m}><label className="label">{m}</label><input className="input" type="number" min="0" placeholder="0" value={perfData[m] ?? ''} onChange={(e) => setPerfData((d) => ({ ...d, [m]: e.target.value }))} /></div>
            ))}
          </div>
          <button onClick={savePerf} className="btn-primary w-full">Save Results</button>
        </div>
      </Modal>
    </div>
  );
}
