/**
 * ChatMarkdown — Lightweight markdown rendering for chat messages.
 * Handles headers, bold, italic, inline code, lists, and tables.
 */
import React from 'react';

/** Render a non-code block with basic markdown. */
export function MarkdownBlock({ text }: { text: string }): React.ReactElement {
    const lines = text.split('\n');
    const elements: React.ReactElement[] = [];
    let tableRows: string[] = [];
    let idx = 0;

    const flushTable = (): void => {
        if (tableRows.length === 0) return;
        elements.push(<MarkdownTable key={'tbl-' + idx++} rows={tableRows} />);
        tableRows = [];
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            tableRows.push(trimmed);
            continue;
        }
        flushTable();

        if (!trimmed) {
            elements.push(<div key={'br-' + idx++} className="h-1.5" />);
            continue;
        }
        const headerMatch = trimmed.match(/^(#{1,4})\s+(.+?)(?:\s*#+\s*)?$/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            const hText = headerMatch[2];
            const hClass = level === 1
                ? 'text-[13px] font-bold text-slate-100 mt-2 mb-1'
                : level === 2
                    ? 'text-[12px] font-bold text-slate-200 mt-1.5 mb-0.5'
                    : 'text-[12px] font-semibold text-slate-300 mt-1 mb-0.5';
            elements.push(
                <div key={'h-' + idx++} className={hClass}><InlineMarkdown text={hText} /></div>,
            );
            continue;
        }
        if (trimmed.match(/^[-*]\s/)) {
            const bullet = trimmed.replace(/^[-*]\s+/, '');
            elements.push(
                <div key={'li-' + idx++} className="flex gap-1.5 pl-1">
                    <span className="text-slate-500 shrink-0">&#8226;</span>
                    <span className="whitespace-pre-wrap"><InlineMarkdown text={bullet} /></span>
                </div>,
            );
            continue;
        }
        const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (numMatch) {
            elements.push(
                <div key={'ol-' + idx++} className="flex gap-1.5 pl-1">
                    <span className="text-slate-500 shrink-0">{numMatch[1]}.</span>
                    <span className="whitespace-pre-wrap"><InlineMarkdown text={numMatch[2]} /></span>
                </div>,
            );
            continue;
        }
        elements.push(
            <span key={'p-' + idx++} className="whitespace-pre-wrap"><InlineMarkdown text={line} /></span>,
        );
    }
    flushTable();
    return <React.Fragment>{elements}</React.Fragment>;
}

/** Render inline markdown: **bold**, *italic*, `code`. */
export function InlineMarkdown({ text }: { text: string }): React.ReactElement {
    const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return (
        <React.Fragment>
            {tokens.map((tok, i) => {
                if (tok.startsWith('**') && tok.endsWith('**')) {
                    return <strong key={i} className="font-semibold text-slate-100">{tok.slice(2, -2)}</strong>;
                }
                if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2) {
                    return <em key={i} className="italic text-slate-300">{tok.slice(1, -1)}</em>;
                }
                if (tok.startsWith('`') && tok.endsWith('`')) {
                    return (
                        <code key={i} className="px-1 py-0.5 rounded bg-navy-950/80 text-[11px] font-mono text-blue-300">
                            {tok.slice(1, -1)}
                        </code>
                    );
                }
                return <React.Fragment key={i}>{tok}</React.Fragment>;
            })}
        </React.Fragment>
    );
}

/** Render a markdown table from pipe-delimited rows. */
function MarkdownTable({ rows }: { rows: string[] }): React.ReactElement {
    const parseRow = (row: string): string[] =>
        row.split('|').slice(1, -1).map((c) => c.trim());

    const dataRows = rows.filter((r) => !r.match(/^\|[\s-:|]+\|$/));
    if (dataRows.length === 0) return <React.Fragment />;

    const header = parseRow(dataRows[0]);
    const body = dataRows.slice(1);

    return (
        <div className="overflow-x-auto my-1.5">
            <table className="text-[11px] border-collapse w-full">
                <thead>
                    <tr>
                        {header.map((h, i) => (
                            <th key={i} className="px-2 py-1 text-left font-semibold text-slate-300 border-b border-slate-600 bg-navy-950/60">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {body.map((row, ri) => (
                        <tr key={ri} className={ri % 2 === 0 ? 'bg-navy-900/30' : ''}>
                            {parseRow(row).map((cell, ci) => (
                                <td key={ci} className="px-2 py-1 text-slate-400 border-b border-slate-700/40">
                                    <InlineMarkdown text={cell} />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
