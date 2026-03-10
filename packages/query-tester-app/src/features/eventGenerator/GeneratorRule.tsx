import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldGenerationRule, GeneratorType } from 'core/types';
import { PickListConfig } from './configs/PickListConfig';
import { NumberedConfig } from './configs/NumberedConfig';
import { RandomNumberConfig } from './configs/RandomNumberConfig';
import { UniqueIdConfig } from './configs/UniqueIdConfig';
import { EmailConfig } from './configs/EmailConfig';
import { IpAddressConfig } from './configs/IpAddressConfig';
import { GeneralFieldConfig } from './configs/GeneralFieldConfig';

const TYPE_OPTIONS: { value: GeneratorType; label: string }[] = [
  { value: 'pick_list', label: 'Pick List \u2014 Random from weighted list' },
  { value: 'numbered', label: 'Numbered \u2014 Sequential (server-001, 002...)' },
  { value: 'random_number', label: 'Random Number \u2014 Range with decimals' },
  { value: 'unique_id', label: 'Unique ID \u2014 UUID or custom format' },
  { value: 'email', label: 'Email \u2014 Generated addresses' },
  { value: 'ip_address', label: 'IP Address \u2014 Private or public ranges' },
  { value: 'general_field', label: 'General \u2014 Custom prefix/suffix + random' },
];

const CONFIG_MAP: Record<GeneratorType, React.FC<any>> = {
  pick_list: PickListConfig,
  numbered: NumberedConfig,
  random_number: RandomNumberConfig,
  unique_id: UniqueIdConfig,
  email: EmailConfig,
  ip_address: IpAddressConfig,
  general_field: GeneralFieldConfig,
};

const inputCls =
  'px-2 py-1.5 text-[13px] bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30 transition';

export interface GeneratorRuleProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  rule: FieldGenerationRule;
  availableFields?: string[];
  usedFields?: string[];
}

export function GeneratorRule({ testId, scenarioId, inputId, rule, availableFields = [], usedFields = [] }: GeneratorRuleProps) {
  const store = useTestStore();

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (!v) return;
    store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, {
      type: v as GeneratorType,
      config: {},
    });
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, { field: e.target.value });
  };

  // Fields available in dropdown: all defined fields minus those used by other rules
  const usedSet = new Set(usedFields);
  const dropdownFields = availableFields.filter((f) => !usedSet.has(f));
  const hasDropdownOptions = dropdownFields.length > 0 || rule.field.trim() !== '';

  const ConfigComponent = rule.type ? CONFIG_MAP[rule.type] : null;

  return (
    <div className="bg-navy-900 border border-slate-800 rounded-lg p-3 mb-2">
      <div className="flex items-center gap-2">
        {hasDropdownOptions ? (
          <select
            className={`${inputCls} flex-1 min-w-0 font-mono cursor-pointer`}
            value={rule.field}
            onChange={handleFieldChange}
          >
            <option value="">Select field...</option>
            {/* Show current field even if it's not in availableFields (e.g. manually typed or removed from table) */}
            {rule.field.trim() && !dropdownFields.includes(rule.field) && (
              <option value={rule.field}>{rule.field}</option>
            )}
            {dropdownFields.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        ) : (
          <input
            className={`${inputCls} flex-1 min-w-0 font-mono`}
            value={rule.field}
            onChange={(e) =>
              store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, { field: e.target.value })
            }
            placeholder="field name"
          />
        )}
        <select
          className={`${inputCls} flex-1 min-w-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
          value={rule.type || ''}
          onChange={handleTypeChange}
          disabled={!rule.field.trim()}
        >
          <option value="">{rule.field.trim() ? 'Select type...' : 'Select a field first...'}</option>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          type="button"
          className="border-none bg-transparent text-slate-500 cursor-pointer px-1.5 py-0.5 rounded transition-colors hover:text-red-400 shrink-0"
          onClick={() => store.deleteGeneratorRule(testId, scenarioId, inputId, rule.id)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {!rule.field.trim() ? (
        <p className="mt-2 text-xs text-slate-600 italic m-0">Select a field first</p>
      ) : ConfigComponent ? (
        <div className="mt-1.5 pt-1.5 border-t border-slate-800">
          <ConfigComponent testId={testId} scenarioId={scenarioId} inputId={inputId} rule={rule} />
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-600 italic m-0">Select a generation type above</p>
      )}
    </div>
  );
}
