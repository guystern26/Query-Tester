# -*- coding: utf-8 -*-
"""
Tests that mimic the EXACT pipeline a scheduled test goes through,
specifically for generator rules — the path that caused KeyError on fieldName.

Pipeline: KVStore definition → build_test_payload → payload_parser → config_parser
"""
from __future__ import annotations

import json
import copy
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from scheduling.scheduled_runner_helpers import build_test_payload
from generators.config_parser import parse_generator_config


# ─── Fixtures: what KVStore actually stores ─────────────────────────────────

def _kvstore_definition():
    """Mimics what the frontend saves to KVStore via saved_tests_handler.
    Keys are FRONTEND format: field, type (not fieldName, generationType).
    """
    return {
        "name": "License Usage Monitor",
        "app": "search",
        "testType": "standard",
        "query": {
            "spl": "index=_internal | stats count by sourcetype",
            "timeRange": {"earliest": "-24h", "latest": "now"},
            "savedSearchOrigin": None,
        },
        "scenarios": [
            {
                "id": "sc-1",
                "name": "Scenario 1",
                "description": "",
                "inputs": [
                    {
                        "id": "inp-1",
                        "rowIdentifier": "index=_internal",
                        "inputMode": "fields",
                        "events": [
                            {
                                "id": "evt-1",
                                "fieldValues": [
                                    {"id": "fv-1", "field": "sourcetype", "value": "splunkd"},
                                    {"id": "fv-2", "field": "count", "value": "100"},
                                ],
                            }
                        ],
                        "generatorConfig": {
                            "enabled": True,
                            "eventCount": 10,
                            "rules": [
                                {
                                    "id": "rule-1",
                                    "field": "sourcetype",       # ← Frontend key
                                    "type": "pick_list",         # ← Frontend key
                                    "config": {
                                        "values": ["splunkd", "scheduler"],
                                    },
                                },
                                {
                                    "id": "rule-2",
                                    "field": "count",            # ← Frontend key
                                    "type": "random_number",     # ← Frontend key
                                    "config": {
                                        "min": 1,
                                        "max": 1000,
                                    },
                                },
                            ],
                        },
                        "jsonContent": "",
                        "fileRef": None,
                        "queryDataConfig": {"spl": "", "timeRange": {"earliest": "", "latest": ""}},
                    }
                ],
            }
        ],
        "validation": {
            "validationType": "standard",
            "fieldGroups": [],
            "fieldLogic": "and",
            "validationScope": "all_events",
            "scopeN": None,
            "resultCount": {"enabled": False, "operator": "greater_than", "value": 0},
        },
    }


def _kvstore_definition_already_normalized():
    """Definition where generator rules already have fieldName/generationType.
    This happens if the definition was saved from a manual run payload.
    """
    d = _kvstore_definition()
    for rule in d["scenarios"][0]["inputs"][0]["generatorConfig"]["rules"]:
        rule["fieldName"] = rule.pop("field")
        rule["generationType"] = rule.pop("type")
    return d


def _kvstore_definition_no_generator():
    """Definition with no generator config."""
    d = _kvstore_definition()
    d["scenarios"][0]["inputs"][0]["generatorConfig"] = {
        "enabled": False,
        "eventCount": 0,
        "rules": [],
    }
    return d


def _kvstore_definition_generator_disabled():
    """Definition with generator config present but disabled."""
    d = _kvstore_definition()
    d["scenarios"][0]["inputs"][0]["generatorConfig"]["enabled"] = False
    return d


# ─── Tests ──────────────────────────────────────────────────────────────────

class TestScheduledGeneratorPipeline:
    """Mimics: KVStore → build_test_payload → payload_parser → config_parser"""

    def test_frontend_keys_get_normalized(self):
        """The main bug: KVStore has field/type, config_parser expects fieldName/generationType."""
        definition = _kvstore_definition()
        saved_test = {"name": "Test", "app": "search"}
        scheduled = {"testName": "Test"}

        payload, spl = build_test_payload(definition, saved_test, scheduled)

        # After build_test_payload, generator rules should be normalized
        gen = payload["scenarios"][0]["inputs"][0]["generatorConfig"]
        assert gen["enabled"] is True
        for rule in gen["rules"]:
            assert "fieldName" in rule, "fieldName missing after normalization"
            assert "generationType" in rule, "generationType missing after normalization"
            assert "field" not in rule, "'field' should have been renamed to 'fieldName'"
            assert "type" not in rule, "'type' should have been renamed to 'generationType'"

    def test_normalized_keys_pass_through_config_parser(self):
        """After normalization, config_parser should parse without KeyError."""
        definition = _kvstore_definition()
        saved_test = {"name": "Test", "app": "search"}
        scheduled = {"testName": "Test"}

        payload, _ = build_test_payload(definition, saved_test, scheduled)
        gen_raw = payload["scenarios"][0]["inputs"][0]["generatorConfig"]

        # This is the call that was throwing KeyError
        gen_config = parse_generator_config(gen_raw)
        assert gen_config.enabled is True
        assert len(gen_config.rules) == 2
        assert gen_config.rules[0].field_name == "sourcetype"
        assert gen_config.rules[0].generation_type == "pick_list"
        assert gen_config.rules[1].field_name == "count"
        assert gen_config.rules[1].generation_type == "random_number"

    def test_already_normalized_keys_not_broken(self):
        """If keys are already fieldName/generationType, don't break them."""
        definition = _kvstore_definition_already_normalized()
        saved_test = {"name": "Test", "app": "search"}
        scheduled = {"testName": "Test"}

        payload, _ = build_test_payload(definition, saved_test, scheduled)
        gen_raw = payload["scenarios"][0]["inputs"][0]["generatorConfig"]

        gen_config = parse_generator_config(gen_raw)
        assert gen_config.rules[0].field_name == "sourcetype"
        assert gen_config.rules[1].field_name == "count"

    def test_disabled_generator_skipped(self):
        """Disabled generator config should not crash normalization."""
        definition = _kvstore_definition_generator_disabled()
        saved_test = {"name": "Test", "app": "search"}
        scheduled = {"testName": "Test"}

        payload, _ = build_test_payload(definition, saved_test, scheduled)
        gen_raw = payload["scenarios"][0]["inputs"][0]["generatorConfig"]

        # Rules still have frontend keys because normalization skips disabled generators
        # But config_parser should handle this since it won't be called for disabled configs
        assert gen_raw["enabled"] is False

    def test_no_generator_config(self):
        """Missing or empty generator should not crash."""
        definition = _kvstore_definition_no_generator()
        saved_test = {"name": "Test", "app": "search"}
        scheduled = {"testName": "Test"}

        payload, _ = build_test_payload(definition, saved_test, scheduled)
        gen_raw = payload["scenarios"][0]["inputs"][0]["generatorConfig"]
        assert gen_raw["enabled"] is False

    def test_events_also_flattened(self):
        """Events should be flattened from fieldValues format to flat dicts."""
        definition = _kvstore_definition()
        saved_test = {"name": "Test", "app": "search"}
        scheduled = {"testName": "Test"}

        payload, _ = build_test_payload(definition, saved_test, scheduled)
        events = payload["scenarios"][0]["inputs"][0]["events"]

        assert len(events) == 1
        assert events[0]["sourcetype"] == "splunkd"
        assert events[0]["count"] == "100"
        assert "fieldValues" not in events[0]
        assert "id" not in events[0]

    def test_full_pipeline_end_to_end(self):
        """Full pipeline: KVStore def → build_payload → parse_generator_config.
        This is the EXACT path scheduled_runner.py takes.
        """
        definition = _kvstore_definition()
        saved_test = {"name": "License Monitor", "app": "search"}
        scheduled = {"testName": "License Monitor", "cronSchedule": "*/30 * * * *"}

        # Step 1: build_test_payload (what scheduled_runner_helpers does)
        payload, query_spl = build_test_payload(definition, saved_test, scheduled)

        assert query_spl == "index=_internal | stats count by sourcetype"
        assert payload["testName"] == "License Usage Monitor"
        assert payload["app"] == "search"

        # Step 2: parse each input's generator config (what payload_parser does)
        for scenario in payload["scenarios"]:
            for inp in scenario["inputs"]:
                gen_raw = inp.get("generatorConfig")
                if gen_raw and isinstance(gen_raw, dict) and gen_raw.get("enabled"):
                    gen_config = parse_generator_config(gen_raw)
                    assert gen_config.enabled is True
                    for rule in gen_config.rules:
                        assert rule.field_name, "field_name should not be empty"
                        assert rule.generation_type, "generation_type should not be empty"

    def test_multiple_inputs_multiple_generators(self):
        """Multiple inputs each with their own generator config."""
        definition = _kvstore_definition()
        # Add a second input with different generator rules
        second_input = copy.deepcopy(definition["scenarios"][0]["inputs"][0])
        second_input["id"] = "inp-2"
        second_input["rowIdentifier"] = "index=main"
        second_input["generatorConfig"]["rules"] = [
            {"id": "rule-3", "field": "host", "type": "pick_list",
             "config": {"values": ["web01", "web02"]}},
        ]
        definition["scenarios"][0]["inputs"].append(second_input)

        saved_test = {"name": "Test", "app": "search"}
        scheduled = {"testName": "Test"}

        payload, _ = build_test_payload(definition, saved_test, scheduled)

        # Both inputs should have normalized generator rules
        for inp in payload["scenarios"][0]["inputs"]:
            gen = inp["generatorConfig"]
            if gen["enabled"]:
                for rule in gen["rules"]:
                    assert "fieldName" in rule
                    assert "generationType" in rule

        # Verify second input specifically
        second_gen = payload["scenarios"][0]["inputs"][1]["generatorConfig"]
        assert second_gen["rules"][0]["fieldName"] == "host"
        assert second_gen["rules"][0]["generationType"] == "pick_list"
