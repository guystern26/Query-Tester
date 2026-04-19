# -*- coding: utf-8 -*-
"""
Comprehensive injection tests — covers all strategies, subsearches,
multi-index, inputlookup, lookup, tstats, complex mixed queries, and
edge cases around row identifiers and first-row filtering.

Imports the real query_injector module (circular import broken via
conftest_injector.py stub that loads core.models without core/__init__).
"""
from __future__ import annotations

import pytest

from spl.query_injector import detect_strategy, inject
from core.models import ParsedInput

RID = "a1b2c3"
R = "index=temp_query_tester run_id_a1b2c3=a1b2c3"
LK = "temp_lookup_a1b2c3"


def _inputs(*row_identifiers):
    # type: (*str) -> list
    """Build ParsedInput list from row identifier strings."""
    return [ParsedInput(row_identifier=ri) for ri in row_identifiers]


def _run(spl, inputs, expected_strategy, expected_out):
    """Detect strategy, inject, and assert both match expectations."""
    strat = detect_strategy(spl)
    out = inject(spl, RID, strat, inputs)
    assert strat == expected_strategy, "strategy: got={}, expected={}".format(
        strat, expected_strategy,
    )
    assert out == expected_out, (
        "\n  INPUT:    {}\n  EXPECTED: {}\n  GOT:      {}".format(
            spl, expected_out, out,
        )
    )


# ── Standard index ─────────────────────────────────────────────────────

class TestStandard:
    def test_simple_index(self):
        _run("index=main | stats count by user", _inputs(""),
             "standard", "{} | stats count by user".format(R))

    def test_index_sourcetype_host_no_ri(self):
        _run("index=main sourcetype=access host=web01 | stats count",
             _inputs(""), "standard",
             "{} sourcetype=access host=web01 | stats count".format(R))

    def test_ri_includes_sourcetype(self):
        _run("index=main sourcetype=access | stats count",
             _inputs("index=main sourcetype=access"),
             "standard", "{} | stats count".format(R))

    def test_ri_full_first_row(self):
        _run("index=main sourcetype=access host=web01 | stats count",
             _inputs("index=main sourcetype=access host=web01"),
             "standard", "{} | stats count".format(R))

    def test_quoted_index(self):
        _run('index="my-index" | stats count', _inputs(""),
             "standard", "{} | stats count".format(R))

    def test_wildcard_index(self):
        _run("index=main* | stats count", _inputs(""),
             "standard", "{} | stats count".format(R))


# ── Subsearches ────────────────────────────────────────────────────────

class TestSubsearch:
    def test_same_index_no_ri(self):
        _run("index=main | append [search index=main | stats count]",
             _inputs(""), "standard",
             "{} | append [search {} | stats count]".format(R, R))

    def test_different_indexes_no_ri(self):
        _run("index=main | append [search index=other | stats count]",
             _inputs(""), "standard",
             "{} | append [search index=other | stats count]".format(R))

    def test_ri_targets_subsearch(self):
        _run("index=main | append [search index=guy | stats count]",
             _inputs("index=guy"), "standard",
             "index=main | append [search {} | stats count]".format(R))

    def test_ri_targets_outer(self):
        _run("index=main | append [search index=other | stats count]",
             _inputs("index=main"), "standard",
             "{} | append [search index=other | stats count]".format(R))

    def test_two_ris(self):
        _run("index=main sourcetype=a | append [search index=guy sourcetype=b]",
             _inputs("index=main sourcetype=a", "index=guy sourcetype=b"),
             "standard", "{} | append [search {}]".format(R, R))

    def test_same_index_three_places(self):
        _run("index=main | append [search index=main] | join [search index=main]",
             _inputs(""), "standard",
             "{} | append [search {}] | join [search {}]".format(R, R, R))

    def test_nested_subsearch(self):
        _run("index=main | append [search index=main [search index=main | head 5]]",
             _inputs(""), "standard",
             "{} | append [search {} [search {} | head 5]]".format(R, R, R))


# ── Inputlookup ───────────────────────────────────────────────────────

class TestInputlookup:
    def test_primary_with_pipe(self):
        _run('| inputlookup users.csv | where status="active"',
             _inputs(""), "inputlookup",
             '{} | where status="active"'.format(R))

    def test_primary_without_pipe(self):
        _run('inputlookup users.csv | where status="active"',
             _inputs(""), "inputlookup",
             '{} | where status="active"'.format(R))

    def test_in_subsearch_with_standard_outer(self):
        _run("index=main | append [| inputlookup users.csv]",
             _inputs(""), "standard",
             "{} | append [{}]".format(R, R))

    def test_primary_plus_subsearch(self):
        _run("| inputlookup main.csv | append [| inputlookup extra.csv]",
             _inputs(""), "inputlookup",
             "{} | append [{}]".format(R, R))

    def test_multiple_in_subsearches(self):
        _run("index=main | append [| inputlookup a.csv] | join [| inputlookup b.csv]",
             _inputs(""), "standard",
             "{} | append [{}] | join [{}]".format(R, R, R))

    def test_with_csv_extension(self):
        _run("| inputlookup my-data.csv | stats count",
             _inputs(""), "inputlookup",
             "{} | stats count".format(R))


# ── Lookup ─────────────────────────────────────────────────────────────

class TestLookup:
    def test_index_with_lookup_enrichment(self):
        """Lookup is just enrichment — only index= gets replaced, lookup untouched."""
        _run("index=main | lookup users_list user AS username | stats count",
             _inputs(""), "lookup",
             "{} | lookup users_list user AS username | stats count".format(R))

    def test_with_ri_index(self):
        """RI is index clause — lookup stays untouched."""
        _run("index=main sourcetype=syslog | lookup users_list user | stats count",
             _inputs("index=main sourcetype=syslog"), "lookup",
             "{} | lookup users_list user | stats count".format(R))


# ── No index / tstats ─────────────────────────────────────────────────

class TestNoIndex:
    def test_bare_spl(self):
        _run('| makeresults | eval foo="bar"', _inputs(""),
             "no_index", '{} | makeresults | eval foo="bar"'.format(R))

    def test_stats_only(self):
        _run("| stats count", _inputs(""),
             "no_index", "{} | stats count".format(R))


class TestTstats:
    def test_noop(self):
        _run("| tstats count where index=main by host", _inputs(""),
             "tstats", "| tstats count where index=main by host")


# ── Complex / mixed ───────────────────────────────────────────────────

class TestComplex:
    def test_index_il_subsearch_ri_clears_first_row(self):
        _run("index=firewall sourcetype=cisco_asa action=blocked "
             "| append [| inputlookup threat_intel.csv] | stats count by src_ip",
             _inputs("index=firewall sourcetype=cisco_asa action=blocked"),
             "standard",
             "{} | append [{}] | stats count by src_ip".format(R, R))

    def test_index_with_or_subsearch(self):
        _run("index=main (status=500 OR status=503) "
             "| append [search index=main status=200]",
             _inputs(""), "standard",
             "{} (status=500 OR status=503) "
             "| append [search {} status=200]".format(R, R))

    def test_two_inputs_different_sourcetypes(self):
        _run("index=main sourcetype=web "
             "| append [search index=main sourcetype=syslog]",
             _inputs("index=main sourcetype=web", "index=main sourcetype=syslog"),
             "standard", "{} | append [search {}]".format(R, R))

    def test_join_subsearch_same_index(self):
        _run("index=security | join type=left user "
             "[search index=security action=login | dedup user]",
             _inputs(""), "standard",
             "{} | join type=left user "
             "[search {} action=login | dedup user]".format(R, R))

    def test_il_primary_lookup_pipe(self):
        _run("| inputlookup assets.csv "
             "| lookup severity_map priority AS level | where severity>3",
             _inputs(""), "inputlookup",
             "{} | lookup severity_map priority AS level "
             "| where severity>3".format(R))


# ── Edge cases ─────────────────────────────────────────────────────────

class TestEdgeCases:
    def test_ri_not_found_falls_back(self):
        _run("index=main | stats count", _inputs("index=nonexistent"),
             "standard", "{} | stats count".format(R))

    def test_empty_spl(self):
        _run("", _inputs(""),
             "no_index", "{} ".format(R))

    def test_single_quoted_index(self):
        _run("index='main' | stats count", _inputs(""),
             "standard", "{} | stats count".format(R))

    def test_case_insensitive_index(self):
        _run("INDEX=Main | stats count", _inputs(""),
             "standard", "{} | stats count".format(R))

    def test_case_insensitive_ri(self):
        _run("INDEX=Main sourcetype=Access | stats count",
             _inputs("index=main sourcetype=access"),
             "standard", "{} | stats count".format(R))

    def test_ri_all_locations(self):
        _run("index=guy | append [search index=guy] | join [search index=guy]",
             _inputs("index=guy"), "standard",
             "{} | append [search {}] | join [search {}]".format(R, R, R))

    def test_multiline_spl(self):
        _run("index=main\n| stats count by host\n| sort -count",
             _inputs(""), "standard",
             "{}\n| stats count by host\n| sort -count".format(R))
