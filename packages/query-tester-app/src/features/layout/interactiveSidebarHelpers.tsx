/**
 * interactiveSidebarHelpers — render helpers for InteractiveSidebar.
 * Extracted to keep the main component file under 200 lines.
 */
import React from 'react';
import type { SourceSpan } from '../../hooks/useSourceSpans';

export const SOURCE_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#06b6d4'];

function buildSourceSpanElement(
    key: string,
    text: string,
    color: string,
    isUsed: boolean,
    onClick: () => void,
    onHover: (e: React.MouseEvent) => void,
    onLeave: () => void,
): React.ReactElement {
    if (isUsed) {
        return (
            <span
                key={key}
                onClick={onClick}
                onMouseEnter={onHover}
                onMouseLeave={onLeave}
                style={{
                    borderBottom: '2px solid ' + color,
                    backgroundColor: color + '20',
                    cursor: 'pointer',
                    borderRadius: '2px',
                }}
            >
                <span style={{
                    display: 'inline-block', width: '5px', height: '5px',
                    borderRadius: '50%', backgroundColor: color,
                    marginRight: '2px', verticalAlign: 'middle',
                }} />
                {text}
            </span>
        );
    }
    return (
        <span
            key={key}
            onClick={onClick}
            style={{
                borderBottom: '2px dotted ' + color,
                backgroundColor: 'transparent',
                cursor: 'pointer',
                borderRadius: '2px',
                transition: 'background-color 150ms',
                animation: 'sourceHighlight 2s ease-out',
            }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = color + '25';
                onHover(e);
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                onLeave();
            }}
        >
            {text}
        </span>
    );
}

/** Check if a source span is covered by any existing input's row identifier (substring match). */
function isSourceUsed(spanRi: string, usedIdentifiers: string[]): boolean {
    const lower = spanRi.toLowerCase();
    for (let k = 0; k < usedIdentifiers.length; k++) {
        // Source is used if any input's RI contains it, or it contains any input's RI
        if (usedIdentifiers[k].indexOf(lower) !== -1 || lower.indexOf(usedIdentifiers[k]) !== -1) {
            return true;
        }
    }
    return false;
}

export function renderInteractiveSpl(
    spl: string,
    spans: SourceSpan[],
    usedIdentifiers: string[],
    onClick: (ri: string, fields: string[]) => void,
    onHover: (e: React.MouseEvent, sp: SourceSpan, isUsed: boolean) => void,
    onLeave: () => void,
): React.ReactElement[] {
    if (spans.length === 0) {
        return [<span key="plain">{spl}</span>];
    }

    const parts: React.ReactElement[] = [];
    let cursor = 0;

    for (let i = 0; i < spans.length; i++) {
        const sp = spans[i];
        if (sp.start < cursor) continue;

        if (sp.start > cursor) {
            parts.push(<span key={'txt-' + i}>{spl.slice(cursor, sp.start)}</span>);
        }

        const isUsed = isSourceUsed(sp.rowIdentifier, usedIdentifiers);
        const color = sp.sourceIndex >= 0
            ? SOURCE_COLORS[sp.sourceIndex % SOURCE_COLORS.length]
            : '#94a3b8';
        const text = spl.slice(sp.start, sp.end);
        const ri = sp.rowIdentifier;
        const fields = sp.fields;
        const hoverHandler = (e: React.MouseEvent) => onHover(e, sp, isUsed);

        const clickHandler = () => onClick(ri, fields);

        parts.push(buildSourceSpanElement(
            'src-' + i, text, color, isUsed, clickHandler, hoverHandler, onLeave,
        ));

        cursor = sp.end;
    }

    if (cursor < spl.length) {
        parts.push(<span key="tail">{spl.slice(cursor)}</span>);
    }
    return parts;
}
