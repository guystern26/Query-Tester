/**
 * splHighlight — SPL syntax highlighting for the query sidebar.
 * Tokenizes SPL and renders colored spans with injection overlays.
 */
import React from 'react';
import type { InjectionRange } from '../../hooks/useInjectionRanges';

var INJ_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#06b6d4'];

var SPL_COMMANDS = [
    'abstract', 'accum', 'addcoltotals', 'addinfo', 'addtotals', 'analyzefields',
    'anomalies', 'anomalousvalue', 'append', 'appendcols', 'appendpipe', 'arules',
    'associate', 'audit', 'autoregress', 'bin', 'bucket', 'bucketdir', 'chart',
    'cluster', 'cofilter', 'collect', 'concurrency', 'contingency', 'convert',
    'correlate', 'datamodel', 'dbinspect', 'dedup', 'delete', 'delta', 'diff',
    'erex', 'eval', 'eventcount', 'eventstats', 'extract', 'fieldformat', 'fields',
    'fieldsummary', 'filldown', 'fillnull', 'findtypes', 'folderize', 'foreach',
    'format', 'from', 'gauge', 'gentimes', 'geom', 'geostats', 'head', 'highlight',
    'history', 'iconify', 'input', 'inputcsv', 'inputlookup', 'iplocation', 'join',
    'kmeans', 'kvform', 'loadjob', 'localize', 'localop', 'lookup', 'makecontinuous',
    'makemv', 'makeresults', 'map', 'mcollect', 'metadata', 'metasearch',
    'multikv', 'multisearch', 'mvcombine', 'mvexpand', 'nomv', 'outlier',
    'outputcsv', 'outputlookup', 'outputtext', 'overlap', 'pivot', 'predict',
    'rangemap', 'rare', 'regex', 'relevancy', 'reltime', 'rename', 'replace',
    'rest', 'return', 'reverse', 'rex', 'rtorder', 'run', 'savedsearch',
    'script', 'scrub', 'search', 'searchtxn', 'selfjoin', 'sendemail', 'set',
    'setfields', 'sichart', 'sirare', 'sistats', 'sitimechart', 'sitop', 'sort',
    'spath', 'stats', 'strcat', 'streamstats', 'table', 'tags', 'tail',
    'timechart', 'timewrap', 'top', 'transaction', 'transpose', 'trendline',
    'tscollect', 'tstats', 'typeahead', 'typelearner', 'typer', 'union',
    'uniq', 'untable', 'where', 'x11', 'xmlkv', 'xmlunescape', 'xpath', 'xyseries',
];

var SPL_KEYWORDS = [
    'as', 'by', 'or', 'and', 'not', 'over', 'output', 'outputnew', 'true', 'false',
];

var CMD_SET = {} as Record<string, boolean>;
for (var ci = 0; ci < SPL_COMMANDS.length; ci++) CMD_SET[SPL_COMMANDS[ci]] = true;
var KW_SET = {} as Record<string, boolean>;
for (var ki = 0; ki < SPL_KEYWORDS.length; ki++) KW_SET[SPL_KEYWORDS[ki]] = true;

interface SplToken { text: string; type: string; }

function tokenizeSpl(spl: string): SplToken[] {
    var tokens: SplToken[] = [];
    var i = 0;
    var len = spl.length;
    while (i < len) {
        var ch = spl[i];
        if (ch === '|') { tokens.push({ text: '|', type: 'pipe' }); i++; continue; }
        if (ch === '"' || ch === "'") {
            var q = ch; var j = i + 1;
            while (j < len && spl[j] !== q) { if (spl[j] === '\\') j++; j++; }
            if (j < len) j++;
            tokens.push({ text: spl.slice(i, j), type: 'string' }); i = j; continue;
        }
        if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
            var ws = i;
            while (ws < len && (spl[ws] === ' ' || spl[ws] === '\t' || spl[ws] === '\n' || spl[ws] === '\r')) ws++;
            tokens.push({ text: spl.slice(i, ws), type: 'plain' }); i = ws; continue;
        }
        if (/[a-zA-Z_]/.test(ch)) {
            var w = i;
            while (w < len && /[\w\.\-\*]/.test(spl[w])) w++;
            var word = spl.slice(i, w);
            var lower = word.toLowerCase();
            if (w < len && spl[w] === '=') {
                tokens.push({ text: word + '=', type: 'field_eq' }); i = w + 1; continue;
            }
            if (CMD_SET[lower]) tokens.push({ text: word, type: 'command' });
            else if (KW_SET[lower]) tokens.push({ text: word, type: 'keyword' });
            else tokens.push({ text: word, type: 'plain' });
            i = w; continue;
        }
        if (/[0-9]/.test(ch)) {
            var n = i;
            while (n < len && /[0-9\.]/.test(spl[n])) n++;
            tokens.push({ text: spl.slice(i, n), type: 'number' }); i = n; continue;
        }
        tokens.push({ text: ch, type: 'plain' }); i++;
    }
    return tokens;
}

var STYLE_MAP: Record<string, React.CSSProperties> = {
    command: { color: '#7db8f0' },
    pipe: { color: '#475569' },
};

export function renderHighlightedSpl(
    spl: string,
    ranges: InjectionRange[],
): React.ReactElement[] {
    var tokens = tokenizeSpl(spl);
    var syntaxRanges: Array<{ start: number; end: number; type: string }> = [];
    var pos = 0;
    for (var ti = 0; ti < tokens.length; ti++) {
        syntaxRanges.push({ start: pos, end: pos + tokens[ti].text.length, type: tokens[ti].type });
        pos += tokens[ti].text.length;
    }

    var injSorted = ranges.slice().sort(function (a, b) { return a.start - b.start; });
    var parts: React.ReactElement[] = [];

    for (var si = 0; si < syntaxRanges.length; si++) {
        var sr = syntaxRanges[si];
        var txt = spl.slice(sr.start, sr.end);
        var tokenStyle = STYLE_MAP[sr.type] || undefined;

        var injMatch = null as InjectionRange | null;
        for (var ri = 0; ri < injSorted.length; ri++) {
            var ir = injSorted[ri];
            if (ir.start <= sr.start && ir.end >= sr.end) { injMatch = ir; break; }
        }

        if (injMatch) {
            var injColor = INJ_COLORS[injMatch.colorIndex % INJ_COLORS.length];
            var wrapStyle: React.CSSProperties = { backgroundColor: injColor + '30', borderBottom: '2px solid ' + injColor };
            parts.push(
                React.createElement('span', { key: 's-' + si, style: wrapStyle },
                    tokenStyle
                        ? React.createElement('span', { style: tokenStyle }, txt)
                        : txt
                )
            );
        } else if (tokenStyle) {
            parts.push(React.createElement('span', { key: 's-' + si, style: tokenStyle }, txt));
        } else {
            parts.push(React.createElement('span', { key: 's-' + si }, txt));
        }
    }
    return parts;
}
