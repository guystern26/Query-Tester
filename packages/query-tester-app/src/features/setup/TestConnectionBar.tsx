import React, { useState, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { ConnectionTestResult } from 'core/types/config';

export function TestConnectionBar() {
    const testConnection = useTestStore((s) => s.testConnection);
    const [result, setResult] = useState<ConnectionTestResult | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTest = useCallback(async () => {
        setIsTesting(true);
        setError(null);
        setResult(null);
        try {
            const r = await testConnection();
            setResult(r);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsTesting(false);
        }
    }, [testConnection]);

    return (
        <div className="border border-slate-700 rounded-lg bg-navy-900 p-4 flex items-center gap-4">
            <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-btnprimary hover:bg-btnprimary-hover text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
                {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            {error && <span className="text-xs text-red-400">{error}</span>}
            {result && (
                <div className="flex items-center gap-4 text-xs">
                    <ResultBadge label="HEC" status={result.hec} detail={result.hecDetail} />
                    <SmtpBadge result={result} />
                </div>
            )}
        </div>
    );
}

interface ResultBadgeProps {
    label: string;
    status: 'ok' | 'error';
    detail: string;
}

function ResultBadge({ label, status, detail }: ResultBadgeProps) {
    const isOk = status === 'ok';
    return (
        <span className={'inline-flex items-center gap-1.5 px-2 py-1 rounded font-medium ' + (isOk ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400')}>
            {label} {isOk ? '\u2713' : '\u2717'}
            {detail && <span className="font-normal text-slate-400 ml-1">{detail}</span>}
        </span>
    );
}

interface SmtpBadgeProps {
    result: ConnectionTestResult;
}

function SmtpBadge({ result }: SmtpBadgeProps) {
    const isOk = result.smtp === 'ok';
    const detail = result.smtpDetail + (isOk && result.tlsMode ? ' (' + result.tlsMode.toUpperCase() + ')' : '');
    return <ResultBadge label="SMTP" status={result.smtp} detail={detail} />;
}
