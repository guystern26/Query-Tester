import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldGenerationRule } from 'core/types';
import { Button } from '../../../common';

export interface EmailConfigProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  rule: FieldGenerationRule;
}

type DomainItem = {
  id: string;
  domain: string;
  weight: number;
};

function getDomains(rule: FieldGenerationRule): DomainItem[] {
  const cfg = (rule.config ?? {}) as any;
  const raw = Array.isArray(cfg.domains) ? cfg.domains : [];
  return raw.map((it: any, idx: number) => ({
    id: String(it.id ?? idx),
    domain: String(it.domain ?? ''),
    weight: typeof it.weight === 'number' ? it.weight : 1,
  }));
}

export function EmailConfig({
  testId,
  scenarioId,
  inputId,
  rule,
}: EmailConfigProps) {
  const store = useTestStore();
  const domains = getDomains(rule);

  const updateDomains = (next: DomainItem[]) => {
    store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, {
      config: {
        ...(rule.config ?? {}),
        domains: next.map((it) => ({
          id: it.id,
          domain: it.domain,
          weight: it.weight,
        })),
      } as any,
    });
  };

  const handleAdd = () => {
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    updateDomains([...domains, { id, domain: '', weight: 1 }]);
  };

  const handleRemove = (id: string) => {
    updateDomains(domains.filter((d) => d.id !== id));
  };

  const handleDomainChange = (id: string, domain: string) => {
    updateDomains(
      domains.map((d) => (d.id === id ? { ...d, domain } : d))
    );
  };

  const handleWeightChange = (id: string, raw: string) => {
    const n = Number(raw);
    if (Number.isNaN(n) || n <= 0) {
      updateDomains(
        domains.map((d) => (d.id === id ? { ...d, weight: 1 } : d))
      );
      return;
    }
    updateDomains(
      domains.map((d) => (d.id === id ? { ...d, weight: n } : d))
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--radius-sm)' }}>
      <div>
        <Button variant="secondary" size="sm" onClick={handleAdd}>
          Add Domain
        </Button>
      </div>
      {domains.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {domains.map((d) => (
            <div
              key={d.id}
              style={{
                display: 'flex',
                gap: 'var(--radius-sm)',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="text"
                value={d.domain}
                onChange={(e) => handleDomainChange(d.id, e.target.value)}
                placeholder="example.com"
                style={{
                  flex: '2 1 180px',
                  padding: '4px 8px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />
              <input
                type="number"
                min={1}
                value={d.weight}
                onChange={(e) => handleWeightChange(d.id, e.target.value)}
                placeholder="weight"
                style={{
                  flex: '0 0 80px',
                  padding: '4px 8px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRemove(d.id)}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

