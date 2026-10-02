import { type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  const maxW = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-charcoal-950/50 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
      <div className={`relative bg-white w-full ${maxW} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-lift ring-1 ring-charcoal-900/[0.06] animate-slideUp no-scrollbar`}>
        <div className="sticky top-0 bg-white/95 glass border-b border-ivory-200 px-5 py-4 flex items-center justify-between z-10">
          <h3 className="text-base font-display text-charcoal-950">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ivory-100 text-stone-500 transition" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
