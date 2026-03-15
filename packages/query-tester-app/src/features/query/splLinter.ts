/**
 * splLinter.ts — Client-side SPL linter.
 *
 * Analyses an SPL string and returns a list of warnings, each with
 * a character range so the editor overlay can highlight the offending token.
 *
 * Runs on blur only — never while the user is typing.
 */

// ── Known Splunk commands ──────────────────────────────────────────────────────
// This is not exhaustive but covers the vast majority of production usage.
const KNOWN_COMMANDS = new Set([
  // Search & filtering
  'search', 'where', 'dedup', 'uniq', 'sort', 'reverse', 'head', 'tail',
  'sample', 'regex', 'rex', 'spath', 'xpath',
  // Transforming
  'stats', 'eventstats', 'streamstats', 'chart', 'timechart', 'top', 'rare',
  'bin', 'bucket', 'cluster', 'contingency', 'correlate', 'kmeans',
  'anomalydetection', 'predict', 'trendline', 'xyseries', 'untable',
  // Eval & calculation
  'eval', 'convert', 'rangemap', 'addtotals', 'addcoltotals', 'addinfo',
  'accum', 'autoregress', 'delta', 'gauge',
  // Field management
  'fields', 'rename', 'table', 'transpose', 'reltime', 'fieldformat',
  'fieldsummary', 'abstract', 'highlight', 'iconify',
  // Lookup & enrichment
  'lookup', 'inputlookup', 'outputlookup', 'inputcsv', 'outputcsv',
  'geostats', 'geom', 'iplocation',
  // Data generation
  'makeresults', 'makemv', 'mvcombine', 'mvexpand', 'nomv',
  'gentimes', 'multikv',
  // Append & join
  'append', 'appendcols', 'appendpipe', 'join', 'selfjoin',
  'multisearch', 'set', 'diff',
  // Alerting & output
  'sendemail', 'collect', 'tscollect', 'meventcollect',
  'outputtext', 'mcollect',
  // Subsearch & macros
  'return', 'format', 'loadjob', 'savedsearch',
  // Reporting
  'sichart', 'sitimechart', 'sistats',
  // Advanced
  'tstats', 'datamodel', 'pivot', 'transaction', 'concurrency',
  'map', 'foreach', 'typeahead',
  // System / meta
  'rest', 'dbinspect', 'metadata', 'eventcount', 'audit',
  'history', 'localop', 'script', 'run',
  // Modify
  'replace', 'fillnull', 'filldown', 'setfields', 'tags',
  'typer', 'typelearner',
  // Delete / admin (blocked but should be recognized)
  'delete', 'drop', 'dbxquery', 'sendalert',
  // CIM / enterprise security
  'datamodel', 'from', 'summariesonly',
  // Misc
  'noop', 'erex', 'xmlkv', 'kvform', 'multikv', 'crawl',
  'mcatalog', 'mpreview', 'msearch',
  'reltime', 'strcat', 'xmlunescape',
]);

// Common typos → correct command
const TYPO_MAP: Record<string, string> = {
  stat: 'stats',
  tstats: 'tstats',
  evenstat: 'eventstats',
  evenstats: 'eventstats',
  eventstat: 'eventstats',
  streamstat: 'streamstats',
  timecharts: 'timechart',
  chart: 'chart',
  chrt: 'chart',
  renam: 'rename',
  renamee: 'rename',
  field: 'fields',
  filed: 'fields',
  filds: 'fields',
  felds: 'fields',
  tabl: 'table',
  tabel: 'table',
  tale: 'table',
  looup: 'lookup',
  lokup: 'lookup',
  lokoup: 'lookup',
  lokop: 'lookup',
  searh: 'search',
  serach: 'search',
  seach: 'search',
  sreach: 'search',
  wher: 'where',
  whre: 'where',
  wheer: 'where',
  inputlokup: 'inputlookup',
  inputlooup: 'inputlookup',
  dedeup: 'dedup',
  dedp: 'dedup',
  evalq: 'eval',
  evals: 'eval',
  evel: 'eval',
  makeresult: 'makeresults',
  sortby: 'sort',
  srot: 'sort',
  trnasaction: 'transaction',
  transction: 'transaction',
  transacton: 'transaction',
  fillnul: 'fillnull',
  repalce: 'replace',
  replce: 'replace',
  rplace: 'replace',
  appned: 'append',
  apped: 'append',
  apend: 'append',
};

// Commands with known limitations / warnings
const COMMAND_WARNINGS: Record<string, string> = {
  join: 'join is limited to 50,000 results. Consider stats values(*) by * instead.',
  append: 'append is limited to 1,000,000 results.',
  transaction: 'transaction is resource-intensive. Consider stats with grouping fields.',
  uniq: 'uniq only removes consecutive duplicates. Use dedup or sort first.',
  delete: 'delete is a blocked command and will be rejected.',
  drop: 'drop is a blocked command and will be rejected.',
  collect: 'collect writes to a summary index — blocked in test mode.',
  outputlookup: 'outputlookup writes data — blocked in test mode.',
  outputcsv: 'outputcsv writes files — blocked in test mode.',
  sendemail: 'sendemail is blocked in test mode.',
  map: 'map is blocked in test mode.',
  script: 'script is blocked in test mode.',
  rest: 'rest is blocked in test mode.',
  dbxquery: 'dbxquery is blocked in test mode.',
  tscollect: 'tscollect is blocked in test mode.',
  meventcollect: 'meventcollect is blocked in test mode.',
};

// ── Lint result ────────────────────────────────────────────────────────────────

export interface SplWarning {
  /** Start character index in the SPL string. */
  start: number;
  /** End character index (exclusive). */
  end: number;
  /** The token that was flagged. */
  token: string;
  /** Human-readable explanation. */
  message: string;
  /** Severity — drives styling. */
  severity: 'error' | 'warning' | 'info';
}

// ── Linter ─────────────────────────────────────────────────────────────────────

/**
 * Lint an SPL string and return a list of warnings with positions.
 * Designed to run on blur — call this only when the editor loses focus.
 */
export function lintSpl(spl: string): SplWarning[] {
  if (!spl.trim()) return [];

  const warnings: SplWarning[] = [];

  // Strip quoted strings so we don't flag content inside them
  const masked = maskQuotedStrings(spl);

  // 1. Find all pipe-command tokens
  const pipeCommandRe = /\|\s*([a-zA-Z_]+)/g;
  let match: RegExpExecArray | null;

  while ((match = pipeCommandRe.exec(masked)) !== null) {
    const cmd = match[1];
    const cmdLower = cmd.toLowerCase();
    const cmdStart = match.index + match[0].indexOf(cmd);
    const cmdEnd = cmdStart + cmd.length;

    // Check for typos first
    if (!KNOWN_COMMANDS.has(cmdLower) && TYPO_MAP[cmdLower]) {
      warnings.push({
        start: cmdStart,
        end: cmdEnd,
        token: cmd,
        message: `Did you mean "${TYPO_MAP[cmdLower]}"?`,
        severity: 'warning',
      });
    } else if (!KNOWN_COMMANDS.has(cmdLower)) {
      // Unknown command entirely
      warnings.push({
        start: cmdStart,
        end: cmdEnd,
        token: cmd,
        message: `Unknown command "${cmd}". Check for typos.`,
        severity: 'warning',
      });
    } else if (COMMAND_WARNINGS[cmdLower]) {
      // Known command with a limitation
      warnings.push({
        start: cmdStart,
        end: cmdEnd,
        token: cmd,
        message: COMMAND_WARNINGS[cmdLower],
        severity: COMMAND_WARNINGS[cmdLower].includes('blocked') ? 'error' : 'info',
      });
    }
  }

  // 2. Find trailing pipes (| at end, or | followed only by whitespace)
  const trailingPipeRe = /\|\s*$/;
  const trailingMatch = trailingPipeRe.exec(masked);
  if (trailingMatch) {
    warnings.push({
      start: trailingMatch.index,
      end: trailingMatch.index + 1,
      token: '|',
      message: 'Pipe without a command after it.',
      severity: 'warning',
    });
  }

  // 3. Find empty pipes (| followed by another |)
  const emptyPipeRe = /\|\s*(?=\|)/g;
  while ((match = emptyPipeRe.exec(masked)) !== null) {
    warnings.push({
      start: match.index,
      end: match.index + 1,
      token: '|',
      message: 'Empty pipe — no command between pipes.',
      severity: 'warning',
    });
  }

  // Sort by position
  warnings.sort((a, b) => a.start - b.start);

  return warnings;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Replace quoted string contents with spaces to avoid false positives. */
function maskQuotedStrings(spl: string): string {
  const chars = Array.from(spl);
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++; // skip opening quote
      while (i < chars.length) {
        if (chars[i] === '\\' && i + 1 < chars.length) {
          chars[i] = ' ';
          chars[i + 1] = ' ';
          i += 2;
          continue;
        }
        if (chars[i] === quote) break;
        chars[i] = ' ';
        i++;
      }
    }
    i++;
  }
  return chars.join('');
}
