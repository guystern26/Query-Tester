import React from 'react';
// TODO: Replace with @splunk/react-ui

export type ModalVariant = 'default' | 'danger';

export interface ModalProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  confirmLabel?: string;
  onConfirm?: () => void;
  variant?: ModalVariant;
}

export function Modal({ open, title, children, onClose, confirmLabel, onConfirm, variant = 'default' }: ModalProps) {
  if (!open) return null;

  const confirmCls = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-500 text-white border border-transparent'
    : 'bg-accent-400 hover:bg-accent-500 text-white border border-transparent';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-navy-900 rounded-xl border border-slate-700 p-0 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-700 font-semibold text-slate-100">{title}</div>
        <div className="px-6 py-4 text-slate-300">{children}</div>
        <div className="px-6 py-3 border-t border-slate-700 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-navy-800 border border-slate-600 text-slate-300 hover:border-slate-500 rounded-lg transition-all duration-200 cursor-pointer"
          >
            Cancel
          </button>
          {confirmLabel != null && onConfirm != null && (
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${confirmCls}`}
            >
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
