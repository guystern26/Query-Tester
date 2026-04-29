/**
 * InjectionPreview — shows the query with row identifiers replaced by temp index.
 * Collapsed by default. Updates live when badges are edited.
 */
import React, { useState, useMemo } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';

const PREVIEW_REPLACEMENT = 'index=temp_query_tester sourcetype=temp_test';

interface InjectionPreviewProps {
    scenarioId: string;
}

export function InjectionPreview({ scenarioId }: InjectionPreviewProps): React.ReactElement | null {
    const test = useTestStore(selectActiveTest);
    const [isOpen, setIsOpen] = useState(false);

    const previewSpl = useMemo(() => {
        if (!test) return '';
        const spl = (test.query && test.query.spl) || '';
        if (!spl) return '';

        const scenario = test.scenarios.find((s) => s.id === scenarioId);
        if (!scenario) return spl;

        let result = spl;
        // Replace each row identifier with the preview replacement
        for (let i = 0; i < scenario.inputs.length; i++) {
            const ri = scenario.inputs[i].rowIdentifier.trim();
            if (!ri) continue;
            // Case-insensitive replace all occurrences
            let pos = 0;
            let built = '';
            const lower = result.toLowerCase();
            const target = ri.toLowerCase();
            while (pos < lower.length) {
                const idx = lower.indexOf(target, pos);
                if (idx === -1) {
                    built += result.slice(pos);
                    break;
                }
                built += result.slice(pos, idx);
                built += PREVIEW_REPLACEMENT;
                pos = idx + ri.length;
            }
            result = built;
        }
        return result;
    }, [test, scenarioId]);

    if (!test || !previewSpl) return null;

    const hasReplacements = previewSpl !== ((test.query && test.query.spl) || '');

    if (!hasReplacements) return null;

    const replacementCount =
        test.scenarios.find((s) => s.id === scenarioId)?.inputs.filter((inp) => inp.rowIdentifier.trim()).length || 0;

    return (
        <div className="mt-3 rounded-lg border border-slate-700/40 overflow-hidden">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-slate-400 hover:text-slate-300 transition-colors cursor-pointer bg-navy-900/50"
            >
                <svg
                    className={'w-3 h-3 transition-transform duration-200' + (isOpen ? ' rotate-90' : '')}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-medium">Preview injected query</span>
                <span className="text-slate-600 text-[11px] ml-1">
                    ({replacementCount} replacements)
                </span>
            </button>
            {isOpen && (
                <pre className="px-3 py-2.5 font-mono text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap break-words bg-navy-950/50 border-t border-slate-700/30 max-h-[200px] overflow-y-auto">
                    {previewSpl}
                </pre>
            )}
        </div>
    );
}
