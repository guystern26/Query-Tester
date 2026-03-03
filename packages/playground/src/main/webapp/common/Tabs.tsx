import React from 'react';
// TODO: Replace with @splunk/react-ui

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  onRemove?: (id: string) => void;
  onAdd?: () => void;
}

export function Tabs({ tabs, activeId, onChange, onRemove, onAdd }: TabsProps) {
  return (
    <div className="flex border-b border-slate-800 gap-1" role="tablist">
      {tabs.map((tab) => (
        <div key={tab.id} className="inline-flex items-center gap-0.5 -mb-px">
          <button
            role="tab"
            aria-selected={tab.id === activeId}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2 text-sm border-b-2 transition cursor-pointer ${
              tab.id === activeId
                ? 'font-semibold text-cyan-400 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:border-slate-600'
            }`}
          >
            {tab.label}
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(tab.id); }}
              className="px-1.5 py-0.5 text-xs text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded cursor-pointer"
              aria-label={`Remove ${tab.label}`}
            >
              ×
            </button>
          )}
        </div>
      ))}
      {onAdd && (
        <button type="button" onClick={onAdd} className="px-3 py-2 text-lg text-slate-500 hover:text-cyan-400 -mb-px cursor-pointer" aria-label="Add tab">
          +
        </button>
      )}
    </div>
  );
}
