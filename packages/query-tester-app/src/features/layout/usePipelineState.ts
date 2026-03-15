import { useTestStore } from 'core/store/testStore';
import { selectActiveTest, selectIsRunning, inputHasData } from 'core/store/selectors';

export interface PipelineStep {
  id: string;
  label: string;
  number: number;
  isComplete: boolean;
  isActive: boolean;
}

export interface PipelineState {
  steps: PipelineStep[];
  activeIndex: number;
  allComplete: boolean;
  isRunning: boolean;
}

export function usePipelineState(): PipelineState {
  const state = useTestStore();
  const test = selectActiveTest(state);
  const isRunning = selectIsRunning(state);

  const testType = test?.testType ?? 'standard';
  const isQueryOnly = testType === 'query_only';

  const setupDone = (test?.app ?? '').trim() !== '';
  const queryDone = (test?.query?.spl ?? '').trim() !== '';
  const dataDone = !isQueryOnly && inputHasData(test?.scenarios ?? []);
  const validationDone = (test?.validation?.fieldGroups?.length ?? 0) > 0 || test?.validation?.resultCount?.enabled === true;

  const completions = isQueryOnly
    ? [queryDone, validationDone]
    : [queryDone, dataDone, validationDone];

  const labels = isQueryOnly
    ? ['Query', 'Validation']
    : ['Query', 'Data', 'Validation'];

  const ids = isQueryOnly
    ? ['query', 'validation']
    : ['query', 'data', 'validation'];

  const activeIndex = completions.findIndex((c) => !c);

  const steps: PipelineStep[] = labels.map((label, i) => ({
    id: ids[i],
    label,
    number: i + 1,
    isComplete: completions[i],
    isActive: i === activeIndex,
  }));

  return { steps, activeIndex, allComplete: activeIndex === -1, isRunning };
}
