/**
 * useSplSyntax — provides the SPL syntax definitions for Ace editor highlighting.
 * The syntax object maps command names to their argument/function/keyword rules,
 * which the Ace SPL mode uses to color commands, functions, arguments, and modifiers.
 * Source: @splunk/dashboard-utils/defaultSPLSyntax.json (extracted as static JSON).
 */
import searchBNF from '../features/query/defaultSPLSyntax.json';

export function useSplSyntax(): Record<string, unknown> {
    return searchBNF as Record<string, unknown>;
}
