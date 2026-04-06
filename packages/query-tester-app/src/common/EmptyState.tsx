import React from 'react';

export interface EmptyStateProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}

export function EmptyState({ icon, iconBg, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
        {icon}
      </div>
      <div className="text-center">
        <p className="text-sm text-slate-300 font-medium m-0">{title}</p>
        <p className="text-xs text-slate-500 mt-1 m-0">{subtitle}</p>
      </div>
      <button
        className="px-4 py-2 rounded-lg text-sm font-semibold bg-btnprimary text-white hover:bg-btnprimary-hover transition cursor-pointer"
        onClick={onAction}
      >
        {actionLabel}
      </button>
    </div>
  );
}
