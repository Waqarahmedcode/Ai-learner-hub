import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { createCampaignWithDefaults } from '@/lib/campaign';
import { DEFAULT_LINKS } from '@/lib/constants';
import { Spinner } from '@/components/ui';

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: 'AI Learner Hub — 500 Growth Sprint',
    ownerName: 'Waqar Ahmed',
    partnerName: 'Sadia',
    target: 500,
    deadlineDate: '2026-08-09',
    deadlineTime: '09:00',
    timezone: 'Asia/Karachi',
    website: DEFAULT_LINKS[0].url,
    fbPage: DEFAULT_LINKS[1].url,
    fbGroup: DEFAULT_LINKS[2].url,
    instagram: DEFAULT_LINKS[3].url,
    youtube: '',
  });
  const [startMetrics, setStartMetrics] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));
  const setMetric = (k: string, v: string) => setStartMetrics((m) => ({ ...m, [k]: v }));

  const metricFields = [
    { key: 'fb_page_followers', label: 'Facebook Page followers' },
    { key: 'fb_group_members', label: 'Facebook Group members' },
    { key: 'ig_followers', label: 'Instagram followers' },
    { key: 'website_visits', label: 'Website visits' },
    { key: 'fb_page_reach', label: 'Facebook Page reach' },
    { key: 'fb_group_engagement', label: 'Facebook Group engagement' },
    { key: 'ig_reach', label: 'Instagram reach' },
    { key: 'total_impressions', label: 'Total impressions' },
  ];

  const normalizeMetrics = (): Record<string, number> => {
    const normalized: Record<string, number> = {};
    for (const field of metricFields) {
      const raw = startMetrics[field.key]?.trim() ?? '';
      if (raw === '') {
        normalized[field.key] = 0;
        continue;
      }
      const value = Number(raw);
      if (!Number.isFinite(value) || !Number.isInteger(value)) {
        throw new Error(`${field.label} must be a whole number or left blank.`);
      }
      if (value < 0) {
        throw new Error(`${field.label} cannot be negative.`);
      }
      normalized[field.key] = value;
    }
    return normalized;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !user) return;
    setError(null);
    let numericMetrics: Record<string, number>;
    try {
      numericMetrics = normalizeMetrics();
    } catch (validationError) {
      const message = validationError instanceof Error ? validationError.message : 'Please check your starting metrics.';
      setError(message);
      return;
    }

    setBusy(true);
    try {
      const deadline = new Date(`${form.deadlineDate}T${form.deadlineTime}:00`).toISOString();
      const camp = await createCampaignWithDefaults(user.id, {
        name: form.name,
        partner_name: form.partnerName,
        target: Number(form.target) || 500,
        deadline,
        timezone: form.timezone,
      });

      const links = [
        { label: 'Website', url: form.website, sort_order: 0 },
        { label: 'Facebook Page', url: form.fbPage, sort_order: 1 },
        { label: 'Facebook Group', url: form.fbGroup, sort_order: 2 },
        { label: 'Instagram', url: form.instagram, sort_order: 3 },
      ];
      if (form.youtube.trim()) links.push({ label: 'YouTube', url: form.youtube.trim(), sort_order: 4 });
      const { error: linksDeleteError } = await supabase.from('official_links').delete().eq('campaign_id', camp.id);
      if (linksDeleteError) throw new Error(`Official links could not be saved: ${linksDeleteError.message}`);
      const { error: linksInsertError } = await supabase.from('official_links').insert(links.map((link) => ({ ...link, campaign_id: camp.id })));
      if (linksInsertError) throw new Error(`Official links could not be saved: ${linksInsertError.message}`);

      const today = new Date().toISOString().slice(0, 10);
      const platformMetrics = [
        { platform: 'Facebook Page', metrics: { Followers: numericMetrics.fb_page_followers, Reach: numericMetrics.fb_page_reach } },
        { platform: 'Facebook Group', metrics: { Members: numericMetrics.fb_group_members, Engagement: numericMetrics.fb_group_engagement } },
        { platform: 'Instagram', metrics: { Followers: numericMetrics.ig_followers, Reach: numericMetrics.ig_reach } },
        { platform: 'Website', metrics: { Visitors: numericMetrics.website_visits } },
        { platform: 'Campaign Total', metrics: { 'Total impressions': numericMetrics.total_impressions } },
      ];
      const { error: metricsError } = await supabase.from('daily_metrics').upsert(
        platformMetrics.map((entry) => ({ campaign_id: camp.id, metric_date: today, platform: entry.platform, metrics: entry.metrics, created_by: user.id })),
        { onConflict: 'campaign_id,metric_date,platform' }
      );
      if (metricsError) throw new Error(`Starting metrics could not be saved: ${metricsError.message}`);

      const { error: campaignError } = await supabase.from('campaigns').update({
        name: form.name,
        partner_name: form.partnerName,
        target: Number(form.target) || 500,
        deadline,
        timezone: form.timezone,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      }).eq('id', camp.id);
      if (campaignError) throw new Error(`Campaign settings could not be saved: ${campaignError.message}`);

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: form.ownerName || 'Waqar Ahmed',
        email: user.email ?? '',
        role: 'OWNER',
        onboarding_completed: true,
      }, { onConflict: 'id' });
      if (profileError) throw new Error(`Owner profile could not be saved: ${profileError.message}`);

      const { data: demoRows, error: demoLookupError } = await supabase.from('tasks').select('id').eq('campaign_id', camp.id).eq('is_demo', true).limit(1);
      if (demoLookupError) throw new Error(`Demo tasks could not be checked: ${demoLookupError.message}`);
      if (!demoRows?.length) {
        const demoTasks = [
          { title: 'Demo: Create first tutorial Reel', platform: 'Instagram', content_format: '30-second Reel', priority: 'High', due_date: today, status: 'Not Started', is_demo: true, assigned_to: user.id },
          { title: 'Demo: Prepare launch carousel', platform: 'Facebook Page', content_format: 'Carousel', priority: 'Medium', due_date: today, status: 'Not Started', is_demo: true, assigned_to: user.id },
          { title: 'Demo: Enter starting analytics', platform: 'General Project', content_format: 'General', priority: 'Medium', due_date: today, status: 'Completed', is_demo: true, assigned_to: user.id },
        ];
        const { error: taskError } = await supabase.from('tasks').insert(demoTasks.map((task) => ({ ...task, campaign_id: camp.id, created_by: user.id, description: 'Demo task — delete anytime.' })));
        if (taskError) throw new Error(`Demo tasks could not be saved: ${taskError.message}`);
      }

      const { error: activityError } = await supabase.from('activity_log').insert({ campaign_id: camp.id, user_id: user.id, action: 'completed campaign onboarding', related_item: form.name });
      if (activityError) throw new Error(`Activity could not be saved: ${activityError.message}`);
      setBusy(false);
      toast('Campaign setup completed successfully.', 'success');
      onDone();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Campaign setup could not be completed.';
      setError(message);
      toast(message, 'error');
      setBusy(false);
    }
  };

  const steps = ['Campaign', 'Official Links', 'Starting Metrics'];
  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="min-h-screen bg-ivory-50 px-5 py-10">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-7">
          <img src="/logo.svg" alt="" className="w-14 h-14 mx-auto rounded-2xl shadow-card object-contain bg-white p-2" />
          <h1 className="mt-4 text-2xl font-display text-charcoal-950 tracking-tight">Set up your campaign</h1>
          <p className="text-sm text-stone-500 mt-1.5">Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}. Let's configure your growth workspace.</p>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors duration-300 ${i <= step ? 'bg-brand-500' : 'bg-ivory-200'}`} />
              <p className={`mt-1.5 text-[10px] font-mono uppercase tracking-wider text-center ${i <= step ? 'text-brand-600 font-semibold' : 'text-stone-400'}`}>{s}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="card-elev space-y-4">
          {step === 0 && (
            <>
              <div><label className="label">Campaign name</label><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
              <div><label className="label">Owner name</label><input className="input" value={form.ownerName} disabled /></div>
              <div><label className="label">Partner name (placeholder)</label><input className="input" value={form.partnerName} onChange={(e) => set('partnerName', e.target.value)} /><p className="text-[11px] text-stone-500 mt-1">Invite your partner by email later from Settings.</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Target (combined)</label><input className="input" type="number" value={form.target} onChange={(e) => set('target', e.target.value)} /></div>
                <div><label className="label">Timezone</label><input className="input" value={form.timezone} onChange={(e) => set('timezone', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Deadline date</label><input className="input" type="date" value={form.deadlineDate} onChange={(e) => set('deadlineDate', e.target.value)} /></div>
                <div><label className="label">Deadline time</label><input className="input" type="time" value={form.deadlineTime} onChange={(e) => set('deadlineTime', e.target.value)} /></div>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div><label className="label">Official Website</label><input className="input" value={form.website} onChange={(e) => set('website', e.target.value)} /></div>
              <div><label className="label">Facebook Page</label><input className="input" value={form.fbPage} onChange={(e) => set('fbPage', e.target.value)} /></div>
              <div><label className="label">Facebook Group</label><input className="input" value={form.fbGroup} onChange={(e) => set('fbGroup', e.target.value)} /></div>
              <div><label className="label">Instagram</label><input className="input" value={form.instagram} onChange={(e) => set('instagram', e.target.value)} /></div>
              <div><label className="label">YouTube (optional)</label><input className="input" value={form.youtube} onChange={(e) => set('youtube', e.target.value)} /></div>
            </>
          )}
          {step === 2 && (
            <>
              <p className="text-sm text-stone-500">Enter your current starting metrics. Leave blank if unknown — all values start at zero.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {metricFields.map((m) => (
                  <div key={m.key}>
                    <label className="label">{m.label}</label>
                    <input className="input" type="number" min="0" placeholder="0" value={startMetrics[m.key] ?? ''} onChange={(e) => setMetric(m.key, e.target.value)} />
                  </div>
                ))}
              </div>
            </>
          )}

          {error && <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
          <div className="flex gap-3 pt-2">
            {step > 0 && <button type="button" onClick={back} className="btn-ghost flex-1">Back</button>}
            {step < steps.length - 1 ? (
              <button type="button" onClick={next} className="btn-primary flex-1">Continue</button>
            ) : (
              <button type="submit" disabled={busy} className="btn-primary flex-1">{busy ? <><Spinner /> Saving…</> : 'Finish Setup'}</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
