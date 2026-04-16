import React, { useState } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import type { ValidationType } from 'core/types';
import { Button, Modal } from '../../common';
import { FieldConditionsGrid } from './FieldConditionsGrid';
import { IjumpValidation } from './IjumpValidation';
import { ResultCountSection } from './ResultCountSection';

export function ValidationSection() {
  const test = useTestStore(selectActiveTest);
  const replaceAllFieldGroups = useTestStore((s) => s.replaceAllFieldGroups);
  const updateResultCount = useTestStore((s) => s.updateResultCount);
  const setValidationType = useTestStore((s) => s.setValidationType);
  const [clearOpen, setClearOpen] = useState(false);

  if (!test) return null;

  const type: ValidationType = test.validation.validationType;

  const handleClearAll = () => {
    replaceAllFieldGroups(test.id, []);
    updateResultCount(test.id, { enabled: false, value: 0 });
    setClearOpen(false);
  };

  const hasSomething = test.validation.fieldGroups.length > 0;

  const segBase = 'px-3.5 py-1.5 text-[13px] font-semibold transition cursor-pointer';

  return (
    <div className="flex flex-col gap-3">
      <ResultCountSection testId={test.id} resultCount={test.validation.resultCount} />

      <div data-tutorial="validation-type" className="flex bg-navy-950 rounded-lg p-1 border border-slate-700 w-fit">
        <button
          className={`${segBase} rounded-md ${type === 'standard' ? 'bg-navy-700 text-white border-2 border-slate-600' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => setValidationType(test.id, 'standard')}
        >
          Standard
        </button>
        <button
          className={`${segBase} rounded-md ${type === 'ijump_alert' ? 'bg-navy-700 text-white border-2 border-slate-600' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => setValidationType(test.id, 'ijump_alert')}
        >
          iJump Alert
        </button>
      </div>

      {type === 'standard' ? <FieldConditionsGrid /> : <IjumpValidation />}

      <div>
        <Button variant="secondary" size="sm" onClick={() => setClearOpen(true)} disabled={!hasSomething}>
          Clear all validation
        </Button>
      </div>

      <Modal open={clearOpen} title="Clear all validation?" onClose={() => setClearOpen(false)} confirmLabel="Clear" onConfirm={handleClearAll} variant="danger">
        <p className="m-0">This will remove all validation conditions and expected results. This cannot be undone.</p>
      </Modal>
    </div>
  );
}
