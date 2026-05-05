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
    onClick: (() => void) | undefined,
    onHover: (e: React.MouseEvent) => void,
    onLeave: () => void,
): React.ReactElement {
    if (isUsed) {
        return (
            <span
                key={key}
                onMouseEnter={onHover}
                onMouseLeave={onLeave}
                style={{
                    borderBottom: '2px solid ' + color,
                    backgroundColor: color + '15',
                    borderRadius: '2px',
                    opacity: 0.5,
                    cursor: 'default',
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

/**
 * Pre-pass: assign each input's RI to a specific span position.
 * - RIs with extra filters (longer than span) claim only the position where the
 *   full RI text matches in the SPL.
 * - RIs matching the span exactly claim one position per input (first unclaimed).
 * Returns Map<spanIndex, claimingRI>.
 */
function buildClaimedMap(
    spl: string, spans: SourceSpan[], usedIdentifiers: string[],
): Map<number, string> {
    const splLower = spl.toLowerCase();
    const claimed = new Map<number, string>();
    // Process longer (more specific) RIs first so they claim the right position
    const sorted = usedIdentifiers.map(function (uid, i) { return { uid: uid, orig: i }; });
    sorted.sort(function (a, b) { return b.uid.length - a.uid.length; });
    var consumed = new Array(usedIdentifiers.length).fill(false);

    for (let u = 0; u < sorted.length; u++) {
        if (consumed[sorted[u].orig]) continue;
        var uid = sorted[u].uid;
        for (let i = 0; i < spans.length; i++) {
            if (claimed.has(i)) continue;
            var spanLower = spans[i].rowIdentifier.trim().toLowerCase();
            // RI has extra filters → must match at this exact position
            if (uid.length > spanLower.length && uid.indexOf(spanLower) === 0) {
                var atPos = splLower.indexOf(uid, spans[i].start);
                if (atPos === spans[i].start) {
                    claimed.set(i, uid);
                    consumed[sorted[u].orig] = true;
                    break;
                }
            }
            // RI matches span exactly → claim first unclaimed
            if (uid === spanLower) {
                claimed.set(i, uid);
                consumed[sorted[u].orig] = true;
                break;
            }
        }
    }
    return claimed;
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

    const claimedMap = buildClaimedMap(spl, spans, usedIdentifiers);
    const parts: React.ReactElement[] = [];
    let cursor = 0;

    for (let i = 0; i < spans.length; i++) {
        const sp = spans[i];
        if (sp.start < cursor) continue;

        if (sp.start > cursor) {
            parts.push(<span key={'txt-' + i}>{spl.slice(cursor, sp.start)}</span>);
        }

        const claimRi = claimedMap.get(i) || null;
        const isUsed = claimRi !== null;
        const color = sp.sourceIndex >= 0
            ? SOURCE_COLORS[sp.sourceIndex % SOURCE_COLORS.length]
            : '#94a3b8';
        // When used and the claiming RI is longer, extend highlight
        let visualEnd = sp.end;
        if (isUsed && claimRi && claimRi.length > sp.rowIdentifier.toLowerCase().length) {
            const idx = spl.toLowerCase().indexOf(claimRi, sp.start);
            if (idx === sp.start) visualEnd = idx + claimRi.length;
        }
        const text = spl.slice(sp.start, visualEnd);
        const ri = sp.rowIdentifier;
        const fields = sp.fields;
        const hoverHandler = (e: React.MouseEvent) => onHover(e, sp, isUsed);

        const clickHandler = isUsed ? undefined : () => onClick(ri, fields);

        parts.push(buildSourceSpanElement(
            'src-' + i, text, color, isUsed, clickHandler, hoverHandler, onLeave,
        ));

        cursor = visualEnd;
    }

    if (cursor < spl.length) {
        parts.push(<span key="tail">{spl.slice(cursor)}</span>);
    }
    return parts;
}
