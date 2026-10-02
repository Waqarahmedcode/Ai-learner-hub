import { type ReactNode } from 'react';

export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {icon && <div className="mb-4 w-14 h-14 rounded-2xl bg-ivory-100 flex items-center justify-center text-stone-400">{icon}</div>}
      <p className="text-sm font-semibold text-charcoal-950">{title}</p>
      {description && <p className="mt-1 text-sm text-stone-500 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      <p className="mt-3 text-sm text-stone-500">{label}</p>
    </div>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <div
      className="border-2 border-white/40 border-t-white rounded-full animate-spin"
      style={{ width: size, height: size }}
    />
  );
}

export function Badge({ children, color = 'neutral' }: {
  children: ReactNode;
  color?: 'neutral' | 'brand' | 'blue' | 'green' | 'amber' | 'red' | 'purple';
}) {
  const map: Record<string, string> = {
    neutral: 'bg-ivory-100 text-charcoal-800',
    brand: 'bg-brand-50 text-brand-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-800',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-violet-50 text-violet-700',
  };
  return <span className={`chip ${map[color]}`}>{children}</span>;
}

export function ProgressBar({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const p = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`h-2 rounded-full bg-ivory-200 overflow-hidden ${className}`}>
      <div
        className="h-full bg-brand-500 rounded-full transition-all duration-700"
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

export function ProgressRing({ value, max, size = 180, stroke = 14, label, sublabel }: {
  value: number; max: number; size?: number; stroke?: number; label?: string; sublabel?: string;
}) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const p = max > 0 ? Math.min(1, value / max) : 0;
  const offset = circ * (1 - p);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F7F1E8" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F97316" strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label && <span className="text-3xl font-mono font-bold text-charcoal-950 tabular-nums">{label}</span>}
        {sublabel && <span className="text-xs font-mono text-stone-500 mt-0.5 tabular-nums">{sublabel}</span>}
      </div>
    </div>
  );
}
