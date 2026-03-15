/**
 * splLinterRules.ts — Command sets, typo map, and warning messages
 * for the client-side SPL linter.
 */

// Known Splunk commands (not exhaustive but covers production usage)
export const KNOWN_COMMANDS = new Set([
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
    'from', 'summariesonly',
    // Misc
    'noop', 'erex', 'xmlkv', 'kvform', 'crawl',
    'mcatalog', 'mpreview', 'msearch',
    'strcat', 'xmlunescape',
]);

// Common typos -> correct command
export const TYPO_MAP: Record<string, string> = {
    stat: 'stats',
    evenstat: 'eventstats',
    evenstats: 'eventstats',
    eventstat: 'eventstats',
    streamstat: 'streamstats',
    timecharts: 'timechart',
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
export const COMMAND_WARNINGS: Record<string, string> = {
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
