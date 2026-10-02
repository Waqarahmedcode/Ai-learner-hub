import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your full name.');
      setBusy(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setBusy(false);
      return;
    }
    const fn = mode === 'signin' ? signIn(email.trim(), password) : signUp(email.trim(), password, name.trim());
    const { error: err } = await fn;
    if (err) setError(err);
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-charcoal-950">
      {/* Decorative backdrop */}
      <div className="absolute inset-0">
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] bg-brand-500/30 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-0 right-0 w-[380px] h-[380px] bg-accent-purple/20 rounded-full blur-[120px] animate-float" style={{ animationDelay: '-4s' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-8 relative">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/logo.svg" alt="AI Learner Hub" className="w-16 h-16 mx-auto rounded-2xl shadow-lift object-contain bg-white p-2 ring-1 ring-white/10" />
            <h1 className="mt-5 text-3xl font-display text-white tracking-tight">AI Learner Hub</h1>
            <p className="text-sm text-ivory-200/70 mt-2">GrowthOS — Plan. Create. Publish. Measure. Grow.</p>
          </div>

          <div className="card-elev !bg-white/[0.98] backdrop-blur">
            <div className="flex bg-ivory-100 rounded-xl p-1 mb-5">
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === 'signup' ? 'bg-white text-charcoal-950 shadow-soft' : 'text-stone-500 hover:text-charcoal-700'}`}
              >Create Account</button>
              <button
                onClick={() => setMode('signin')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === 'signin' ? 'bg-white text-charcoal-950 shadow-soft' : 'text-stone-500 hover:text-charcoal-700'}`}
              >Sign In</button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="label">Full name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Waqar Ahmed" />
                </div>
              )}
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div>
                <label className="label">Password</label>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 ring-1 ring-red-100">{error}</p>}
              <button type="submit" disabled={busy} className="btn-primary w-full !py-3.5">
                {busy ? <Spinner /> : mode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            {mode === 'signup' && (
              <p className="mt-4 text-xs text-stone-500 text-center leading-relaxed">
                The first account created becomes the Owner. You can invite your Partner (Sadia) later from Settings.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
