import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldGenerationRule, NumberedGeneratorConfig } from 'core/types';
import { VHelper } from './VariantRow';

export interface NumberedConfigProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  rule: FieldGenerationRule;
}

function getCfg(rule: FieldGenerationRule): NumberedGeneratorConfig {
  const c = rule.config as any;
  return {
    pattern: String(c?.pattern ?? ''),
    rangeStart: typeof c?.rangeStart === 'number' ? c.rangeStart : 1,
    rangeEnd: typeof c?.rangeEnd === 'number' ? c.rangeEnd : 10,
    padLength: typeof c?.padLength === 'number' ? c.padLength : 0,
  };
}

const inputCls =
  'px-2 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition';
const labelCls = 'text-[10px] text-slate-500 uppercase shrink-0';

export function NumberedConfig({ testId, scenarioId, inputId, rule }: NumberedConfigProps) {
  const store = useTestStore();
  const cfg = getCfg(rule);

  const save = (patch: Partial<NumberedGeneratorConfig>) => {
    store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, {
      config: { ...cfg, ...patch } as any,
    });
  };

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-2">
        <span className={labelCls}>Pattern</span>
        <input
          className={`${inputCls} flex-1 font-mono`}
          value={cfg.pattern}
          onChange={(e) => save({ pattern: e.target.value })}
          placeholder="e.g. server-###"
        />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className={labelCls}>Start</span>
          <input type="number" className={`${inputCls} w-16`} value={cfg.rangeStart} onChange={(e) => save({ rangeStart: Number(e.target.value) || 0 })} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={labelCls}>End</span>
          <input type="number" className={`${inputCls} w-16`} value={cfg.rangeEnd} onChange={(e) => save({ rangeEnd: Number(e.target.value) || 0 })} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={labelCls}>Pad</span>
          <input type="number" min={0} max={10} className={`${inputCls} w-12`} value={cfg.padLength} onChange={(e) => save({ padLength: Math.min(Number(e.target.value) || 0, 10) })} />
        </div>
      </div>
      <VHelper>Example: server-001, server-002...</VHelper>
    </div>
  );
}
