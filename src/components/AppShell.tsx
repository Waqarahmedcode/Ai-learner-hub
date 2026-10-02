import { useState, type ReactNode } from 'react';
import { Menu, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useCampaign } from '@/lib/campaign';
import { NAV_ITEMS, type ScreenKey } from './nav';
import { Badge } from './ui';

interface ShellProps {
  current: ScreenKey;
  onNavigate: (s: ScreenKey) => void;
  children: ReactNode;
}

export function AppShell({ current, onNavigate, children }: ShellProps) {
  const { profile, signOut } = useAuth();
  const { campaign } = useCampaign();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navList = NAV_ITEMS;
  const currentItem = navList.find((n) => n.key === current);

  return (
    <div className="min-h-screen bg-ivory-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-charcoal-950 fixed inset-y-0 left-0 z-30 shadow-lift">
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="AI Learner Hub" className="w-10 h-10 rounded-xl object-contain bg-white p-1 ring-1 ring-white/10" />
            <div>
              <p className="text-sm font-display text-white leading-tight tracking-tight">GrowthOS</p>
              <p className="text-[10px] text-ivory-200/50 font-mono uppercase tracking-wider">AI Learner Hub</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navList.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  active ? 'bg-white/[0.08] text-white' : 'text-ivory-200/60 hover:bg-white/[0.04] hover:text-ivory-100'
                }`}
              >
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-brand-500" />}
                <Icon size={18} className={active ? 'text-brand-400' : ''} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center text-xs font-bold shadow-soft">
              {profile?.full_name?.[0] ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{profile?.full_name}</p>
              <p className="text-[10px] text-ivory-200/50">{profile?.role === 'OWNER' ? 'Owner' : 'Partner'}</p>
            </div>
          </div>
          <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-ivory-200/50 hover:bg-white/[0.06] hover:text-ivory-100 transition">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-charcoal-950/60 backdrop-blur-sm animate-fadeIn" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 inset-y-0 w-72 bg-charcoal-950 shadow-lift animate-slideUp p-4 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <img src="/logo.svg" alt="AI Learner Hub" className="w-10 h-10 rounded-xl object-contain bg-white p-1 ring-1 ring-white/10" />
              <div>
                <p className="text-sm font-display text-white tracking-tight">GrowthOS</p>
                <p className="text-[10px] text-ivory-200/50 font-mono uppercase tracking-wider">AI Learner Hub</p>
              </div>
            </div>
            <nav className="flex-1 space-y-1">
              {navList.map((item) => {
                const Icon = item.icon;
                const active = current === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => { onNavigate(item.key); setSidebarOpen(false); }}
                    className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      active ? 'bg-white/[0.08] text-white' : 'text-ivory-200/60 hover:bg-white/[0.04] hover:text-ivory-100'
                    }`}
                  >
                    {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-brand-500" />}
                    <Icon size={18} className={active ? 'text-brand-400' : ''} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center text-xs font-bold shadow-soft">
                  {profile?.full_name?.[0] ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{profile?.full_name}</p>
                  <p className="text-[10px] text-ivory-200/50">{profile?.role === 'OWNER' ? 'Owner' : 'Partner'}</p>
                </div>
              </div>
              <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-ivory-200/50 hover:bg-white/[0.06] hover:text-ivory-100 transition">
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-20 bg-white/90 glass border-b border-ivory-200 pt-safe">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-ivory-100 transition">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="" className="w-7 h-7 rounded-lg object-contain" />
              <span className="font-display text-charcoal-950 text-base tracking-tight">GrowthOS</span>
            </div>
            <div className="w-9" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 pt-4 pb-28 md:pb-8 md:px-8 max-w-5xl mx-auto w-full">
          <div className="mb-4 md:mb-6">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-stone-500">
              <span>{currentItem?.label}</span>
              {campaign && <><ChevronRight size={12} /><span className="truncate normal-case tracking-normal font-sans">{campaign.name}</span></>}
            </div>
          </div>
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 glass border-t border-ivory-200 pb-safe">
          <div className="flex justify-around px-1 pt-1.5">
            {navList.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const active = current === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg flex-1 transition-colors ${
                    active ? 'text-brand-600' : 'text-stone-500'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg flex-1 text-stone-500"
            >
              <Badge color="brand">More</Badge>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
