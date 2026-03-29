/**
 * DestinationActions — IDE action buttons: Send to Test, Open in Splunk, Save As.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { AppSelector } from '../../components/AppSelector';
import { SaveAsModal } from './SaveAsModal';

type SaveType = 'saved_search' | 'alert' | 'report';

const TRANSFER_KEY = 'qt_ide_transfer';

function DropdownBtn(
    { label, children }: { label: string; children: React.ReactNode },
): React.ReactElement {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent): void => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((p) => !p)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-navy-800 border border-slate-700 text-slate-300 hover:text-slate-100 hover:border-slate-600 cursor-pointer transition-colors"
            >
                {label}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1 min-w-[180px] bg-navy-900 border border-slate-700 rounded-lg shadow-xl z-50 py-1 animate-fadeIn">
                    {React.Children.map(children, (child) =>
                        React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<{ onClick?: () => void }>, {
                            onClick: (...args: unknown[]) => {
                                setOpen(false);
                                const orig = (child as React.ReactElement<{ onClick?: (...a: unknown[]) => void }>).props.onClick;
                                if (orig) orig(...args);
                            },
                        }) : child,
                    )}
                </div>
            )}
        </div>
    );
}

function MenuItem({ label, onClick }: { label: string; onClick?: () => void }): React.ReactElement {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-navy-800 hover:text-slate-100 cursor-pointer transition-colors"
        >
            {label}
        </button>
    );
}

export function DestinationActions(): React.ReactElement {
    const test = useTestStore(selectActiveTest);
    const appConfig = useTestStore((s) => s.appConfig);
    const [saveModalType, setSaveModalType] = useState<SaveType | null>(null);
    const [appPickerOpen, setAppPickerOpen] = useState(false);
    const appPickerRef = useRef<HTMLDivElement>(null);

    const spl = test?.query?.spl ?? '';
    const app = test?.app ?? '';
    const name = test?.name ?? '';
    const timeRange = test?.query?.timeRange;

    useEffect(() => {
        if (!appPickerOpen) return;
        const handler = (e: MouseEvent): void => {
            if (appPickerRef.current && !appPickerRef.current.contains(e.target as Node)) {
                setAppPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [appPickerOpen]);

    const splunkWebUrl = (appConfig?.splunkWebUrl ?? '').replace(/\/+$/, '');

    const handleContinueToBuilder = useCallback(() => {
        const transfer = { spl, app, name, action: 'continue', timestamp: Date.now(), timeRange: timeRange || undefined };
        localStorage.setItem(TRANSFER_KEY, JSON.stringify(transfer));
        window.location.href = '/app/QueryTester/QueryTesterApp#tester';
    }, [spl, app, name]);

    const openInSplunk = useCallback((targetApp: string) => {
        if (!splunkWebUrl) return;
        const url = splunkWebUrl + '/app/' + encodeURIComponent(targetApp) +
            '/search?q=' + encodeURIComponent(spl);
        window.open(url, '_blank');
    }, [splunkWebUrl, spl]);

    const handleOpenInCurrentApp = useCallback(() => {
        openInSplunk(app);
    }, [openInSplunk, app]);

    const handleOtherAppPick = useCallback((picked: string) => {
        setAppPickerOpen(false);
        openInSplunk(picked);
    }, [openInSplunk]);

    return (
        <div className="flex items-center gap-1.5">
            {/* Continue to Builder */}
            <button
                type="button"
                onClick={handleContinueToBuilder}
                disabled={!spl.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/35 hover:text-blue-200 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
                Continue to Builder
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>

            {/* Open in Splunk */}
            {splunkWebUrl && (
                <div className="relative" ref={appPickerRef}>
                    <DropdownBtn label="Open in Splunk">
                        <MenuItem
                            label={'Open in ' + (app || 'current app')}
                            onClick={handleOpenInCurrentApp}
                        />
                        <MenuItem
                            label="Open in other app..."
                            onClick={() => setAppPickerOpen(true)}
                        />
                    </DropdownBtn>
                    {appPickerOpen && (
                        <div className="absolute top-full left-0 mt-1 z-[60] bg-navy-900 border border-slate-700 rounded-lg shadow-xl p-2 min-w-[200px] animate-fadeIn">
                            <AppSelector value="" onChange={handleOtherAppPick} />
                        </div>
                    )}
                </div>
            )}

            {/* Save As */}
            <DropdownBtn label="Save As">
                <MenuItem label="Saved Search" onClick={() => setSaveModalType('saved_search')} />
                <MenuItem label="Alert" onClick={() => setSaveModalType('alert')} />
                <MenuItem label="Report" onClick={() => setSaveModalType('report')} />
            </DropdownBtn>

            {saveModalType && (
                <SaveAsModal
                    saveType={saveModalType}
                    spl={spl}
                    app={app}
                    onClose={() => setSaveModalType(null)}
                />
            )}
        </div>
    );
}
