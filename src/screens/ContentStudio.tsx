import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCampaign } from '@/lib/campaign';
import { useToast } from '@/lib/toast';
import { logActivity } from '@/lib/data';
import { CONTENT_PLATFORMS, FORMATS, LANGUAGES, TONES, GENERATION_SECTIONS } from '@/lib/constants';
import { Spinner, Badge } from '@/components/ui';
import { Sparkles, Save, Copy, RefreshCw, FileText, CheckSquare, CalendarPlus, Lightbulb } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';

const EMPTY_OUTPUT: Record<string, string> = Object.fromEntries(GENERATION_SECTIONS.map((s) => [s.key, '']));

export function ContentStudio({ onNavigate }: { onNavigate: (s: 'library' | 'today' | 'calendar') => void }) {
  const { campaign } = useCampaign();
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    topic: '', objective: '', audience: '', platform: 'Instagram', format: '30-second Reel',
    language: 'English', tone: 'Educational', videoDuration: '30', ctaType: 'Follow',
    keyInfo: '', offer: '', instructions: '', screenFootage: 'No', presenter: 'No',
    urgency: 'Medium', educationLevel: 'Beginner',
  });
  const [output, setOutput] = useState<Record<string, string>>(EMPTY_OUTPUT);
  const [busy, setBusy] = useState(false);
  const [geminiConnected, setGeminiConnected] = useState<boolean | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!form.topic.trim()) { toast('Please enter a topic', 'error'); return; }
    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? '';
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content-campaign`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ input: form }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      if (data.geminiConnected === false) setGeminiConnected(false);
      else setGeminiConnected(true);
      const out = { ...EMPTY_OUTPUT };
      const result = data.output ?? data;
      for (const s of GENERATION_SECTIONS) {
        const val = result[s.key];
        if (typeof val === 'string') out[s.key] = val;
        else if (Array.isArray(val)) out[s.key] = val.map((v: unknown) => typeof v === 'string' ? v : JSON.stringify(v, null, 2)).join('\n');
        else if (val && typeof val === 'object') out[s.key] = JSON.stringify(val, null, 2);
      }
      setOutput(out);
      toast('Campaign generated');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Generation failed';
      if (msg.includes('not connected') || msg.includes('GEMINI_API_KEY')) {
        setGeminiConnected(false);
        toast('Gemini API is not connected. Add GEMINI_API_KEY in Bolt Secrets.', 'error');
      } else {
        toast(msg, 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const regenerateSection = (key: string) => {
    setOutput((o) => ({ ...o, [key]: `[Regenerate "${key}" — tap Generate again to refresh this section]` }));
    toast('Section marked for regeneration. Tap Generate to refresh.', 'info');
  };

  const save = async () => {
    if (!campaign || !user) return;
    const { error } = await supabase.from('content_generations').insert({
      campaign_id: campaign.id,
      input: form,
      output,
      created_by: user.id,
    });
    if (error) { toast('Could not save generation', 'error'); return; }
    await logActivity(campaign.id, user.id, 'saved a content generation', form.topic);
    toast('Generation saved to database');
  };

  const convertToContent = async () => {
    if (!campaign || !user) return;
    const { error } = await supabase.from('content_items').insert({
      campaign_id: campaign.id,
      title: output.contentTitle || form.topic,
      topic: form.topic,
      platform: form.platform,
      format: form.format,
      hook: output.hooks,
      script: output.voiceOverScript,
      caption: output.instagramCaption || output.facebookPageCaption,
      cta: output.cta,
      status: 'Script Draft',
      created_by: user.id,
    });
    if (error) { toast('Could not create content item', 'error'); return; }
    await logActivity(campaign.id, user.id, 'converted generation to content', output.contentTitle || form.topic);
    toast('Saved to Content Library');
    onNavigate('library');
  };

  const convertToTask = async () => {
    if (!campaign || !user) return;
    const { error } = await supabase.from('tasks').insert({
      campaign_id: campaign.id,
      title: `Create: ${output.contentTitle || form.topic}`,
      description: output.voiceOverScript || form.topic,
      assigned_to: user.id,
      platform: form.platform,
      content_format: form.format,
      priority: 'High',
      due_date: new Date().toISOString().slice(0, 10),
      status: 'Not Started',
      created_by: user.id,
    });
    if (error) { toast('Could not create task', 'error'); return; }
    toast('Task created in Today');
    onNavigate('today');
  };

  const convertToCalendar = async () => {
    if (!campaign || !user) return;
    const tomorrow = new Date(Date.now() + 86400000);
    tomorrow.setHours(10, 0, 0, 0);
    const { error } = await supabase.from('calendar_entries').insert({
      campaign_id: campaign.id,
      title: output.contentTitle || form.topic,
      platform: form.platform,
      format: form.format,
      scheduled_at: tomorrow.toISOString(),
      assigned_to: user.id,
      status: 'Pending',
    });
    if (error) { toast('Could not create calendar entry', 'error'); return; }
    toast('Scheduled in Calendar');
    onNavigate('calendar');
  };

  const hasOutput = Object.values(output).some((v) => v.trim());

  return (
    <div className="space-y-4">
      <div>
        <h2 className="section-title">AI Content Studio</h2>
        <p className="text-xs text-stone-500">Generate a complete campaign package for any platform</p>
      </div>

      {geminiConnected === false && (
        <div className="card-elev bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800 font-semibold">Gemini API is not connected.</p>
          <p className="text-xs text-amber-700 mt-1">Add GEMINI_API_KEY in Bolt Secrets to enable AI generation. The rest of the app remains fully usable.</p>
        </div>
      )}

      {/* Input form */}
      <div className="card-elev space-y-3">
        <div><label className="label">Topic *</label><input className="input" value={form.topic} onChange={(e) => set('topic', e.target.value)} placeholder="e.g. 5 AI tools every student should know" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label">Main objective</label><input className="input" value={form.objective} onChange={(e) => set('objective', e.target.value)} placeholder="Grow Instagram followers" /></div>
          <div><label className="label">Target audience</label><input className="input" value={form.audience} onChange={(e) => set('audience', e.target.value)} placeholder="Beginners learning AI" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Platform</label><select className="input" value={form.platform} onChange={(e) => set('platform', e.target.value)}>{CONTENT_PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></div>
          <div><label className="label">Content format</label><select className="input" value={form.format} onChange={(e) => set('format', e.target.value)}>{FORMATS.map((p) => <option key={p}>{p}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Language</label><select className="input" value={form.language} onChange={(e) => set('language', e.target.value)}>{LANGUAGES.map((p) => <option key={p}>{p}</option>)}</select></div>
          <div><label className="label">Tone</label><select className="input" value={form.tone} onChange={(e) => set('tone', e.target.value)}>{TONES.map((p) => <option key={p}>{p}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Video duration (sec)</label><input className="input" type="number" value={form.videoDuration} onChange={(e) => set('videoDuration', e.target.value)} /></div>
          <div><label className="label">CTA type</label><input className="input" value={form.ctaType} onChange={(e) => set('ctaType', e.target.value)} placeholder="Follow, Share, Join" /></div>
        </div>
        <div><label className="label">Key information</label><textarea className="input" rows={2} value={form.keyInfo} onChange={(e) => set('keyInfo', e.target.value)} /></div>
        <div><label className="label">Offer or giveaway</label><input className="input" value={form.offer} onChange={(e) => set('offer', e.target.value)} /></div>
        <div><label className="label">Additional instructions</label><textarea className="input" rows={2} value={form.instructions} onChange={(e) => set('instructions', e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Real screen footage</label><select className="input" value={form.screenFootage} onChange={(e) => set('screenFootage', e.target.value)}><option>Yes</option><option>No</option></select></div>
          <div><label className="label">Presenter required</label><select className="input" value={form.presenter} onChange={(e) => set('presenter', e.target.value)}><option>Yes</option><option>No</option></select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Content urgency</label><select className="input" value={form.urgency} onChange={(e) => set('urgency', e.target.value)}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
          <div><label className="label">Educational level</label><select className="input" value={form.educationLevel} onChange={(e) => set('educationLevel', e.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
        </div>
        <button onClick={generate} disabled={busy} className="btn-primary w-full !py-3.5">
          {busy ? <><Spinner /> Generating…</> : <><Sparkles size={18} /> Generate Complete Campaign</>}
        </button>
      </div>

      {/* Output */}
      {hasOutput && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="section-title">Generated Campaign</h3>
            <div className="flex gap-2 flex-wrap">
              <button onClick={save} className="btn-ghost !py-2"><Save size={14} /> Save</button>
              <button onClick={convertToContent} className="btn-outline !py-2"><FileText size={14} /> To Library</button>
              <button onClick={convertToTask} className="btn-outline !py-2"><CheckSquare size={14} /> To Task</button>
              <button onClick={convertToCalendar} className="btn-outline !py-2"><CalendarPlus size={14} /> To Calendar</button>
            </div>
          </div>
          {GENERATION_SECTIONS.map((s) => (
            <div key={s.key} className="card">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-charcoal-900">{s.label}</h4>
                <div className="flex gap-1">
                  <button onClick={() => copyToClipboard(output[s.key])} className="p-1.5 rounded-lg hover:bg-ivory-100 text-stone-400" title="Copy"><Copy size={14} /></button>
                  <button onClick={() => setEditingKey(editingKey === s.key ? null : s.key)} className="p-1.5 rounded-lg hover:bg-ivory-100 text-stone-400" title="Edit"><FileText size={14} /></button>
                  <button onClick={() => regenerateSection(s.key)} className="p-1.5 rounded-lg hover:bg-ivory-100 text-stone-400" title="Regenerate"><RefreshCw size={14} /></button>
                </div>
              </div>
              {editingKey === s.key ? (
                <textarea className="input" rows={5} value={output[s.key]} onChange={(e) => setOutput((o) => ({ ...o, [s.key]: e.target.value }))} />
              ) : (
                <p className="text-sm text-stone-600 whitespace-pre-wrap">{output[s.key] || <span className="text-stone-400 italic">Not generated</span>}</p>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Badge color="neutral"><Lightbulb size={10} /> Convert this generation</Badge>
          </div>
        </div>
      )}
    </div>
  );
}
