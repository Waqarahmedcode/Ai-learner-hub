import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCampaign } from '@/lib/campaign';
import { useToast } from '@/lib/toast';
import { useCampaignData, logActivity } from '@/lib/data';
import { copyToClipboard, downloadCSV } from '@/lib/utils';
import { Copy, ExternalLink, Trash2, Download, Save, UserPlus, Link2 } from 'lucide-react';
import { Badge, Loading } from '@/components/ui';

export function SettingsScreen() {
  const { campaign, links, members, partnerProfile, refresh } = useCampaign();
  const { user, isOwner, profile } = useAuth();
  const { tasks, content, dailyMetrics, loading, reload } = useCampaignData();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: campaign?.name ?? '',
    partner_name: campaign?.partner_name ?? '',
    target: campaign?.target ?? 500,
    deadlineDate: campaign?.deadline.slice(0, 10) ?? '2026-08-09',
    deadlineTime: campaign?.deadline.slice(11, 16) ?? '09:00',
    timezone: campaign?.timezone ?? 'Asia/Karachi',
  });
  const [linkForms, setLinkForms] = useState<Record<string, string>>(
    Object.fromEntries(links.map((l) => [l.id, l.url]))
  );
  const [inviteEmail, setInviteEmail] = useState('');
  const [secrets, setSecrets] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const saveCampaign = async () => {
    if (!campaign || !user) return;
    const deadline = new Date(`${form.deadlineDate}T${form.deadlineTime}:00`).toISOString();
    const { error } = await supabase.from('campaigns').update({
      name: form.name, partner_name: form.partner_name, target: Number(form.target), deadline, timezone: form.timezone, updated_at: new Date().toISOString(),
    }).eq('id', campaign.id);
    if (error) { toast('Could not save settings', 'error'); return; }
    await logActivity(campaign.id, user.id, 'updated campaign settings', form.name);
    toast('Settings saved');
    refresh();
  };

  const saveLink = async (id: string) => {
    const url = linkForms[id];
    if (!url) return;
    const { error } = await supabase.from('official_links').update({ url }).eq('id', id);
    if (error) { toast('Could not update link', 'error'); return; }
    toast('Link updated');
    refresh();
  };

  const invitePartner = async () => {
    if (!inviteEmail.trim()) { toast('Enter an email address', 'error'); return; }
    setBusy(true);
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', inviteEmail.trim()).maybeSingle();
    if (existing && campaign) {
      await supabase.from('campaign_members').insert({ campaign_id: campaign.id, user_id: (existing as any).id, role: 'PARTNER' });
      toast('Partner added to campaign');
    } else {
      toast('That account does not exist yet. Ask your partner to sign up first, then add them.', 'info');
    }
    setBusy(false);
  };

  const deleteDemo = async () => {
    if (!campaign || !user) return;
    if (!confirm('Delete all demo tasks? This only removes items labelled "Demo".')) return;
    await supabase.from('tasks').delete().eq('campaign_id', campaign.id).eq('is_demo', true);
    toast('Demo data deleted');
    reload();
  };

  const exportProject = () => {
    downloadCSV('tasks.csv', tasks as unknown as Record<string, unknown>[]);
    downloadCSV('content.csv', content as unknown as Record<string, unknown>[]);
    downloadCSV('analytics.csv', dailyMetrics.map((m) => ({ date: m.metric_date, platform: m.platform, ...m.metrics })) as Record<string, unknown>[]);
    toast('Project data exported');
  };

  if (loading) return <Loading label="Loading settings…" />;

  return (
    <div className="space-y-4">
      <div><h2 className="section-title">Settings</h2><p className="text-xs text-stone-500">Manage your campaign and workspace</p></div>

      {/* Campaign settings */}
      <div className="card-elev space-y-3">
        <h3 className="text-sm font-bold text-charcoal-900">Campaign</h3>
        <div><label className="label">Campaign name</label><input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Partner name</label><input className="input" value={form.partner_name} onChange={(e) => setForm((f) => ({ ...f, partner_name: e.target.value }))} /></div>
          <div><label className="label">Target (combined)</label><input className="input" type="number" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: Number(e.target.value) }))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Deadline date</label><input className="input" type="date" value={form.deadlineDate} onChange={(e) => setForm((f) => ({ ...f, deadlineDate: e.target.value }))} /></div>
          <div><label className="label">Deadline time</label><input className="input" type="time" value={form.deadlineTime} onChange={(e) => setForm((f) => ({ ...f, deadlineTime: e.target.value }))} /></div>
        </div>
        <div><label className="label">Timezone</label><input className="input" value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} /></div>
        <button onClick={saveCampaign} className="btn-primary w-full"><Save size={16} /> Save Campaign</button>
      </div>

      {/* Team */}
      <div className="card-elev space-y-3">
        <h3 className="text-sm font-bold text-charcoal-900">Team</h3>
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-3 bg-ivory-50 rounded-xl p-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">{m.profile?.full_name?.[0] ?? '?'}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-charcoal-900">{m.profile?.full_name ?? 'Unknown'}</p>
              <p className="text-xs text-stone-500">{m.profile?.email ?? 'No email'}</p>
            </div>
            <Badge color={m.role === 'OWNER' ? 'brand' : 'blue'}>{m.role === 'OWNER' ? 'Owner' : 'Partner'}</Badge>
          </div>
        ))}
        {partnerProfile === null && (
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-sm font-semibold text-amber-800">Partner placeholder: {campaign?.partner_name ?? 'Sadia'}</p>
            <p className="text-xs text-amber-700 mt-1">Invite your partner by email once they create an account.</p>
            <div className="flex gap-2 mt-2">
              <input className="input" placeholder="partner@email.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              <button onClick={invitePartner} disabled={busy} className="btn-outline"><UserPlus size={16} /> Add</button>
            </div>
          </div>
        )}
      </div>

      {/* Official links */}
      <div className="card-elev space-y-3">
        <div className="flex items-center gap-2"><Link2 size={18} className="text-brand-500" /><h3 className="text-sm font-bold text-charcoal-900">Official Links</h3></div>
        {links.map((link) => (
          <div key={link.id} className="space-y-1">
            <label className="label">{link.label}</label>
            <div className="flex gap-2">
              <input className="input" value={linkForms[link.id] ?? link.url} onChange={(e) => setLinkForms((lf) => ({ ...lf, [link.id]: e.target.value }))} />
              <button onClick={() => copyToClipboard(linkForms[link.id] ?? link.url)} className="p-2 rounded-lg bg-ivory-100 hover:bg-ivory-200 text-stone-500"><Copy size={16} /></button>
              <a href={linkForms[link.id] ?? link.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-ivory-100 hover:bg-ivory-200 text-brand-600"><ExternalLink size={16} /></a>
              <button onClick={() => saveLink(link.id)} className="btn-ghost !py-2 !px-3">Save</button>
            </div>
          </div>
        ))}
      </div>

      {/* Gemini status */}
      <div className="card-elev">
        <h3 className="text-sm font-bold text-charcoal-900 mb-2">Gemini Connection</h3>
        {secrets === null ? (
          <button onClick={async () => { const s = await checkSecrets(); setSecrets(s); }} className="btn-ghost">Check connection</button>
        ) : secrets.includes('GEMINI_API_KEY') ? (
          <Badge color="green">Connected</Badge>
        ) : (
          <div>
            <Badge color="amber">Not connected</Badge>
            <p className="text-xs text-stone-500 mt-2">Add GEMINI_API_KEY in Bolt Secrets to enable AI generation. The app works fully without it.</p>
          </div>
        )}
      </div>

      {/* Brand assets */}
      <div className="card-elev">
        <h3 className="text-sm font-bold text-charcoal-900 mb-3">Brand Assets</h3>
        <div className="flex items-center gap-4">
          <img src="/logo.svg" alt="Logo" className="w-16 h-16 rounded-xl object-contain bg-white p-1 border border-ivory-200" />
          <div>
            <p className="text-xs font-semibold text-charcoal-900">Official Logo</p>
            <p className="text-[11px] text-stone-500">Used across the app, PWA icon, and reports</p>
          </div>
        </div>
      </div>

      {/* Data management */}
      <div className="card-elev space-y-3">
        <h3 className="text-sm font-bold text-charcoal-900">Data Management</h3>
        <button onClick={exportProject} className="btn-ghost w-full"><Download size={16} /> Export Project Data (CSV)</button>
        {isOwner && <button onClick={deleteDemo} className="btn-danger w-full"><Trash2 size={16} /> Delete All Demo Data</button>}
      </div>

      <p className="text-[11px] text-stone-400 text-center">Signed in as {profile?.email}</p>
    </div>
  );
}

async function checkSecrets(): Promise<string[]> {
  try {
    const { data } = await supabase.functions.invoke('generate-content-campaign', { body: { input: { topic: 'check' } } });
    if (data?.geminiConnected === false) return [];
    return ['GEMINI_API_KEY'];
  } catch {
    return [];
  }
}
