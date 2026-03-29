/**
 * SaveAsModal — Save SPL as a Splunk saved search, alert, or report.
 * Posts directly to Splunk's saved/searches REST endpoint.
 */
import React, { useState, useCallback } from 'react';
import { createRESTURL } from '@splunk/splunk-utils/url';
import { getDefaultFetchInit } from '@splunk/splunk-utils/fetch';

type SaveType = 'saved_search' | 'alert' | 'report';

const TYPE_LABELS: Record<SaveType, string> = {
    saved_search: 'Saved Search',
    alert: 'Alert',
    report: 'Report',
};

const SEVERITY_OPTIONS = ['info', 'low', 'medium', 'high', 'critical'];
const INPUT_CLS = 'px-3 py-2 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20';
const SM_SELECT_CLS = 'px-2 py-1 text-xs bg-navy-950 border border-slate-700 rounded text-slate-200';

interface SaveAsModalProps {
    saveType: SaveType;
    spl: string;
    app: string;
    onClose: () => void;
}

function buildParams(
    name: string, spl: string, description: string, saveType: SaveType,
    alertOp: string, alertVal: string, alertSeverity: string,
): URLSearchParams {
    const p = new URLSearchParams();
    p.set('name', name.trim());
    p.set('search', spl);
    if (description.trim()) p.set('description', description.trim());
    if (saveType === 'report') { p.set('is_scheduled', '0'); p.set('disabled', '0'); }
    if (saveType === 'alert') {
        p.set('is_scheduled', '1');
        p.set('alert_type', 'number of events');
        p.set('alert_comparator', alertOp);
        p.set('alert_threshold', alertVal);
        p.set('alert.severity', SEVERITY_OPTIONS.indexOf(alertSeverity).toString());
        p.set('alert.suppress', '0');
        p.set('cron_schedule', '*/5 * * * *');
    }
    return p;
}

export function SaveAsModal({ saveType, spl, app, onClose }: SaveAsModalProps): React.ReactElement {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [sharing, setSharing] = useState<'user' | 'app'>('user');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [alertOp, setAlertOp] = useState('>');
    const [alertVal, setAlertVal] = useState('0');
    const [alertSeverity, setAlertSeverity] = useState('medium');

    const handleSave = useCallback(async () => {
        if (!name.trim()) { setError('Name is required.'); return; }
        setSaving(true);
        setError(null);
        try {
            const owner = sharing === 'app' ? 'nobody' : 'admin';
            const url = createRESTURL('saved/searches', { app, owner }) + '?output_mode=json';
            const defaults = getDefaultFetchInit();
            const params = buildParams(name, spl, description, saveType, alertOp, alertVal, alertSeverity);
            const response = await fetch(url, {
                method: 'POST',
                credentials: defaults.credentials as RequestCredentials,
                headers: { ...(defaults.headers as Record<string, string>), 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
            });
            if (response.status === 409) { setError('A search with this name already exists.'); setSaving(false); return; }
            if (!response.ok) {
                let msg = 'Save failed: ' + response.status;
                try {
                    const body = await response.json();
                    const msgs = body?.messages;
                    if (Array.isArray(msgs) && msgs.length > 0) msg = msgs.map((m: { text?: string }) => m.text || '').join('; ') || msg;
                } catch { /* ignore */ }
                setError(msg); setSaving(false); return;
            }
            setSuccess(true);
            setTimeout(onClose, 1200);
        } catch (e) { setError(String(e)); setSaving(false); }
    }, [name, description, sharing, spl, app, saveType, alertOp, alertVal, alertSeverity, onClose]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={onClose}>
            <div className="w-full max-w-md bg-navy-900 border border-slate-700 rounded-xl shadow-2xl p-5 flex flex-col gap-4 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-200">Save as {TYPE_LABELS[saveType]}</h2>
                    <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                {success ? (
                    <div className="py-6 text-center text-green-400 text-sm font-medium">{TYPE_LABELS[saveType]} saved successfully.</div>
                ) : (
                    <>
                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Name *</span>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} autoFocus className={INPUT_CLS} placeholder="My search name" />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Description</span>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={INPUT_CLS + ' resize-y'} placeholder="Optional description" />
                        </label>
                        <fieldset className="flex flex-col gap-1">
                            <legend className="text-[11px] text-slate-500 uppercase tracking-wider">Sharing</legend>
                            <div className="flex gap-4 mt-1">
                                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                                    <input type="radio" name="sharing" checked={sharing === 'user'} onChange={() => setSharing('user')} /> Private
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                                    <input type="radio" name="sharing" checked={sharing === 'app'} onChange={() => setSharing('app')} /> Shared in app
                                </label>
                            </div>
                        </fieldset>
                        {saveType === 'alert' && (
                            <div className="flex flex-col gap-2 border-t border-slate-700 pt-3">
                                <span className="text-[11px] text-slate-500 uppercase tracking-wider">Alert Trigger</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">Number of results</span>
                                    <select value={alertOp} onChange={(e) => setAlertOp(e.target.value)} className={SM_SELECT_CLS}>
                                        <option value=">">{'>'}</option><option value="<">{'<'}</option><option value="=">{'='}</option><option value="!=">{'!='}</option>
                                    </select>
                                    <input type="number" value={alertVal} onChange={(e) => setAlertVal(e.target.value)} className={'w-16 ' + SM_SELECT_CLS} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">Severity</span>
                                    <select value={alertSeverity} onChange={(e) => setAlertSeverity(e.target.value)} className={SM_SELECT_CLS}>
                                        {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                        {error && <div className="px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-xs text-red-400">{error}</div>}
                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium rounded-lg bg-navy-800 text-slate-400 hover:text-slate-200 border border-slate-700 cursor-pointer transition-colors">Cancel</button>
                            <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Saving...' : 'Save'}</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
