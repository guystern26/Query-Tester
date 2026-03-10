# -*- coding: utf-8 -*-
"""
test_runner.py
Coordinate end-to-end execution of Splunk Query Tester scenarios.
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple
from uuid import uuid4
import time

from logger import get_logger
from core.models import ParsedScenario, ScenarioResult, TestPayload, ValidationDetail
from core.payload_parser import parse
from core.response_builder import build_response
from spl.spl_analyzer import SplAnalysis, analyze as analyze_spl
from spl.query_injector import detect_strategy, inject
from spl.query_executor import QueryExecutor
from generators.event_generator import build_events
from data.data_indexer import index_events
from data.sub_query_runner import run_sub_query
from data.lookup_manager import create_temp_lookup, delete_temp_lookup
from validation.result_validator import validate


logger = get_logger(__name__)


class TestRunner:
    """Parse payload, run each scenario independently, and build a response."""

    def __init__(self, session_key: str) -> None:
        self._session_key = session_key
        self._executor = QueryExecutor(session_key)

    def run_test(self, raw_payload: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
        """
        Parse payload, run each scenario, and return response dict with HTTP status.
        """
        try:
            payload = parse(raw_payload)
            spl = self._resolve_spl(payload)
            analysis = analyze_spl(spl)
        except ValueError as exc:
            logger.error("Client error while preparing test: %s", str(exc), exc_info=True)
            return (
                {
                    "status": "error",
                    "message": str(exc),
                    "scenarioResults": [],
                },
                400,
            )
        except Exception as exc:
            logger.error("Fatal error while preparing test: %s", str(exc), exc_info=True)
            return (
                {
                    "status": "error",
                    "message": "Internal error while preparing test payload.",
                    "scenarioResults": [],
                },
                500,
            )

        scenario_results = []  # type: List[ScenarioResult]

        if payload.test_type == "query_only":
            # query_only: run the raw SPL as-is, no injection, no data indexing
            try:
                result = self._run_query_only(payload, spl)
            except Exception as exc:
                logger.error("query_only failed: %s", str(exc), exc_info=True)
                result = ScenarioResult(
                    scenario_name="Query Only",
                    passed=False,
                    execution_time_ms=0,
                    result_count=0,
                    injected_spl=spl,
                    validations=[],
                    error=str(exc),
                )
            scenario_results.append(result)
        else:
            for scenario in payload.scenarios:
                run_id = uuid4().hex[:8]
                strategy = detect_strategy(spl)
                try:
                    result = self._run_scenario(payload, spl, analysis, scenario, run_id, strategy)
                except Exception as exc:
                    logger.error(
                        'Scenario "%s" failed: %s', scenario.name, str(exc), exc_info=True
                    )
                    result = ScenarioResult(
                        scenario_name=scenario.name,
                        passed=False,
                        execution_time_ms=0,
                        result_count=0,
                        injected_spl="",
                        validations=[],
                        error=str(exc),
                    )
                finally:
                    self._cleanup(run_id, strategy, payload.app)

                scenario_results.append(result)

        response = build_response(payload, analysis, scenario_results)
        return response, 200

    def _run_scenario(
        self,
        payload: TestPayload,
        spl: str,
        analysis: SplAnalysis,
        scenario: ParsedScenario,
        run_id: str,
        strategy: str,
    ) -> ScenarioResult:
        all_events = []  # type: List[Dict[str, Any]]
        for inp in scenario.inputs:
            if inp.input_mode == "query_data" and inp.query_data_config is not None:
                # Run sub-query to fetch events as test data
                qd = inp.query_data_config
                sub_events = run_sub_query(
                    spl=qd.spl,
                    session_key=self._session_key,
                    app=payload.app,
                    earliest_time=qd.earliest_time,
                    latest_time=qd.latest_time,
                )
                logger.info(
                    "query_data sub-query returned %d events for scenario '%s'",
                    len(sub_events),
                    scenario.name,
                )
                all_events.extend(sub_events)
            else:
                all_events.extend(build_events(inp))

        if payload.test_type != "query_only" and strategy not in ("inputlookup", "tstats"):
            if all_events:
                index_events(all_events, run_id, self._session_key)

        if strategy == "lookup" and all_events:
            create_temp_lookup(run_id, all_events, payload.app)

        injected_spl = inject(spl, run_id, strategy, scenario.inputs)

        start_ms = int(time.time() * 1000)
        results = self._executor.run(
            injected_spl,
            app=payload.app,
            earliest_time=payload.earliest_time,
            latest_time=payload.latest_time,
        )
        elapsed_ms = int(time.time() * 1000) - start_ms

        validations, passed = validate(payload.validation, scenario, results)

        return ScenarioResult(
            scenario_name=scenario.name,
            passed=passed,
            execution_time_ms=elapsed_ms,
            result_count=len(results),
            injected_spl=injected_spl,
            validations=validations,
            result_rows=results,
            error=None,
        )

    def _run_query_only(
        self,
        payload: TestPayload,
        spl: str,
    ) -> ScenarioResult:
        """Run the SPL as-is with no injection or data indexing."""
        dummy_scenario = ParsedScenario(name="Query Only", inputs=[])

        start_ms = int(time.time() * 1000)
        results = self._executor.run(
            spl,
            app=payload.app,
            earliest_time=payload.earliest_time,
            latest_time=payload.latest_time,
        )
        elapsed_ms = int(time.time() * 1000) - start_ms

        validations, passed = validate(payload.validation, dummy_scenario, results)

        return ScenarioResult(
            scenario_name="Query Only",
            passed=passed,
            execution_time_ms=elapsed_ms,
            result_count=len(results),
            injected_spl=spl,
            validations=validations,
            result_rows=results,
            error=None,
        )

    def _resolve_spl(self, payload: TestPayload) -> str:
        if payload.query and payload.query.strip():
            return payload.query.strip()
        raise ValueError(
            'Payload must include a non-empty "query" field.'
        )

    def cancel(self) -> None:
        """Cancel the currently running search job."""
        self._executor.cancel()

    def _cleanup(self, run_id: str, strategy: str, app: str) -> None:
        # Indexed events are NOT deleted — the 24h retention in indexes.conf
        # handles automatic cleanup. Only temp lookup CSVs are removed.
        if strategy == "lookup":
            try:
                delete_temp_lookup(run_id, app)
            except Exception as exc:
                logger.warning(
                    "Lookup cleanup failed for run_id=%s: %s", run_id, str(exc)
                )
