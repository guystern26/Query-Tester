/**
 * ChatMessageParts — Sub-components for IdeChat message rendering.
 * Extracted to keep IdeChat.tsx under 200 lines.
 */
import React, { useState, useCallback } from 'react';
import type { ChatMessageEntry, ActionResult } from '../../core/store/slices/chatSlice';
import type { ParsedAction } from './chatUtils';
import { ChatActionResult } from './ChatActionResult';
import { AgentStepCard } from './AgentStepCard';

const COPIED_TIMEOUT_MS = 1500;

// ── Empty state ─────────────────────────────────────────────────

const SUGGESTIONS = [
    'What does this query do?',
    'Help me debug this',
    'Optimize this query',
];

interface EmptyStateProps {
    onSuggestion: (text: string) => void;
}

export function ChatEmptyState({ onSuggestion }: EmptyStateProps): React.ReactElement {
    return (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
            <p className="text-[12px] text-slate-500">Ask anything about your SPL query</p>
            <div className="flex flex-col gap-1.5 w-full">
                {SUGGESTIONS.map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => onSuggestion(s)}
                        className="text-left text-[12px] px-3 py-1.5 rounded bg-navy-800 text-slate-400 hover:text-slate-200 hover:bg-navy-700 border border-slate-700/50 transition cursor-pointer"
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── Message bubble ──────────────────────────────────────────────

interface MessageBubbleProps {
    message: ChatMessageEntry;
    onExecuteAction: (messageId: string, actionId: string) => void;
}

export function MessageBubble({ message, onExecuteAction }: MessageBubbleProps): React.ReactElement {
    const isUser = message.role === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[90%] rounded-lg px-3 py-2 text-[12px] leading-relaxed ${
                    isUser
                        ? 'bg-blue-500/20 text-slate-200'
                        : 'bg-navy-800 text-slate-300 border border-slate-700/50'
                }`}
            >
                {!isUser && message.agentSteps && message.agentSteps.length > 0 && (
                    <AgentActivity steps={message.agentSteps} />
                )}
                <MessageContent content={message.content} />
                {message.actions && message.actions.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-2">
                        {message.actions.map((action) => (
                            <ActionButton
                                key={action.id}
                                action={action}
                                result={message.actionResults?.[action.id]}
                                onExecute={() => onExecuteAction(message.id, action.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Message content with code blocks ────────────────────────────

function MessageContent({ content }: { content: string }): React.ReactElement {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
        <React.Fragment>
            {parts.map((part, i) => {
                if (part.startsWith('```')) {
                    const code = part.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
                    return <CodeBlock key={i} code={code} />;
                }
                return <span key={i} className="whitespace-pre-wrap">{part}</span>;
            })}
        </React.Fragment>
    );
}

function CodeBlock({ code }: { code: string }): React.ReactElement {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), COPIED_TIMEOUT_MS);
        }).catch(() => { /* clipboard unavailable */ });
    }, [code]);

    return (
        <div className="relative group mt-1 mb-1">
            <pre className="px-2 py-1.5 pr-8 rounded bg-navy-950/80 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                {code}
            </pre>
            <CopyButton onClick={handleCopy} copied={copied} size={12} />
        </div>
    );
}

// ── Action button (run_query / update_spl) ──────────────────────

interface ActionButtonProps {
    action: ParsedAction;
    result: ActionResult | undefined;
    onExecute: () => void;
}

function ActionButton({ action, result, onExecute }: ActionButtonProps): React.ReactElement {
    const isRunQuery = action.type === 'run_query';
    const label = isRunQuery ? 'Run this query' : 'Apply to editor';
    const isDone = result?.status === 'success';
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(action.payload).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), COPIED_TIMEOUT_MS);
        }).catch(() => { /* clipboard unavailable */ });
    }, [action.payload]);

    return (
        <div className="border border-slate-700/50 rounded p-2 bg-navy-900/50">
            <div className="relative group">
                <pre className="text-[10px] text-slate-400 font-mono mb-1.5 pr-7 overflow-x-auto whitespace-pre-wrap max-h-16 overflow-y-auto">
                    {action.payload}
                </pre>
                <CopyButton onClick={handleCopy} copied={copied} size={10} className="top-0 right-0 p-0.5" />
            </div>
            {!isDone ? (
                <button
                    type="button"
                    onClick={onExecute}
                    disabled={result?.status === 'loading'}
                    className="text-[11px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 transition cursor-pointer"
                >
                    {result?.status === 'loading' ? 'Running...' : label}
                </button>
            ) : (
                <span className="text-[11px] text-emerald-400">
                    {isRunQuery ? 'Done' : 'Applied'}
                </span>
            )}
            {result && isRunQuery && <ChatActionResult result={result} />}
        </div>
    );
}

// ── Agent activity (collapsible step list) ───────────────────────

import type { AgentStep } from './agentLoop';

function AgentActivity({ steps }: { steps: AgentStep[] }): React.ReactElement {
    const [open, setOpen] = useState(false);

    return (
        <div className="mb-2">
            <button type="button" onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 transition cursor-pointer">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" className={'transition ' + (open ? 'rotate-90' : '')}>
                    <polyline points="9 18 15 12 9 6" />
                </svg>
                Agent activity ({steps.length} step{steps.length !== 1 ? 's' : ''})
            </button>
            {open && (
                <div className="flex flex-col gap-1 mt-1">
                    {steps.map((step) => <AgentStepCard key={step.id} step={step} />)}
                </div>
            )}
        </div>
    );
}

// ── Shared copy button ──────────────────────────────────────────

interface CopyButtonProps {
    onClick: () => void;
    copied: boolean;
    size: number;
    className?: string;
}

function CopyButton({ onClick, copied, size, className }: CopyButtonProps): React.ReactElement {
    const base = 'absolute rounded bg-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition cursor-pointer';
    const pos = className || 'top-1 right-1 p-1';

    return (
        <button type="button" onClick={onClick} className={`${base} ${pos}`} title="Copy to clipboard">
            {copied ? (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            ) : (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
            )}
        </button>
    );
}
