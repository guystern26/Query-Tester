# -*- coding: utf-8 -*-
"""Tests for saved_tests_handler.py CRUD operations."""
from __future__ import annotations

import json
from unittest.mock import patch

import pytest

from helpers import make_request, parse_response, SESSION_KEY
from saved_tests_handler import SavedTestsHandler


SAMPLE_DEFINITION = {
    "id": "def-1",
    "name": "My Test",
    "app": "search",
    "testType": "standard",
    "scenarios": [],
    "query": {"spl": "index=main | stats count", "timeRange": {"earliest": "-1h", "latest": "now"}},
    "validation": {},
}


@pytest.fixture
def handler():
    return SavedTestsHandler()


class TestGet:
    def test_returns_empty_list(self, handler, patch_kv):
        resp = handler.handle(make_request("GET"))
        data, status = parse_response(resp)
        assert status == 200
        assert data == []

    def test_returns_saved_tests_sorted(self, handler, patch_kv):
        patch_kv.seed("saved_tests", [
            {"id": "a", "name": "Old", "updatedAt": "2026-01-01T00:00:00Z",
             "definition": json.dumps(SAMPLE_DEFINITION)},
            {"id": "b", "name": "New", "updatedAt": "2026-03-01T00:00:00Z",
             "definition": json.dumps(SAMPLE_DEFINITION)},
        ])
        resp = handler.handle(make_request("GET"))
        data, _ = parse_response(resp)
        assert len(data) == 2
        assert data[0]["name"] == "New"  # Most recent first

    def test_deserializes_definition_string(self, handler, patch_kv):
        patch_kv.seed("saved_tests", [
            {"id": "c", "definition": json.dumps({"app": "search"}), "updatedAt": ""},
        ])
        resp = handler.handle(make_request("GET"))
        data, _ = parse_response(resp)
        assert isinstance(data[0]["definition"], dict)
        assert data[0]["definition"]["app"] == "search"


class TestPost:
    def test_creates_test_with_uuid(self, handler, patch_kv):
        payload = {
            "name": "New Test",
            "app": "search",
            "description": "A test",
            "definition": SAMPLE_DEFINITION,
        }
        resp = handler.handle(make_request("POST", payload))
        data, status = parse_response(resp)
        assert status == 201
        assert data["name"] == "New Test"
        assert len(data["id"]) == 36  # UUID format
        assert data["createdBy"] == "admin"
        assert isinstance(data["definition"], dict)

    def test_stores_definition_as_json_string(self, handler, patch_kv):
        payload = {"name": "T", "definition": {"app": "search"}}
        handler.handle(make_request("POST", payload))
        stored = patch_kv.get_all("saved_tests")[0]
        # In KVStore, definition is stored as a JSON string
        assert isinstance(stored["definition"], str)


class TestPut:
    def test_updates_name_preserves_immutable(self, handler, patch_kv):
        patch_kv.seed("saved_tests", [
            {"id": "u1", "name": "Old", "createdAt": "2026-01-01", "createdBy": "bob",
             "definition": json.dumps(SAMPLE_DEFINITION), "updatedAt": "2026-01-01"},
        ])
        payload = {"name": "Updated"}
        req = make_request("PUT", payload, query={"id": "u1"})
        resp = handler.handle(req)
        data, status = parse_response(resp)
        assert status == 200
        assert data["name"] == "Updated"
        assert data["createdAt"] == "2026-01-01"
        assert data["createdBy"] == "bob"
        assert data["updatedAt"] > "2026-01-01"

    def test_missing_id_returns_400(self, handler, patch_kv):
        resp = handler.handle(make_request("PUT", {"name": "x"}))
        data, status = parse_response(resp)
        assert status == 400
        assert "Missing record ID" in data["error"]


class TestDelete:
    @pytest.fixture(autouse=True)
    def _mock_search(self):
        with patch("saved_tests_handler.delete_saved_search") as mock:
            self._mock_delete_search = mock
            yield

    def test_deletes_test(self, handler, patch_kv):
        patch_kv.seed("saved_tests", [{"id": "d1", "name": "Doomed"}])
        req = make_request("DELETE", query={"id": "d1"})
        resp = handler.handle(req)
        data, status = parse_response(resp)
        assert status == 200
        assert data["deleted"] == "d1"
        assert len(patch_kv.get_all("saved_tests")) == 0

    def test_cascade_deletes_schedule(self, handler, patch_kv):
        patch_kv.seed("saved_tests", [{"id": "d2", "name": "Scheduled"}])
        patch_kv.seed("scheduled_tests", [{"id": "s1", "testId": "d2"}])
        req = make_request("DELETE", query={"id": "d2"})
        resp = handler.handle(req)
        data, status = parse_response(resp)
        assert status == 200
        assert data["deleted"] == "d2"
        assert len(patch_kv.get_all("saved_tests")) == 0
        assert len(patch_kv.get_all("scheduled_tests")) == 0
        self._mock_delete_search.assert_called_once_with(SESSION_KEY, "s1")

    def test_missing_id_returns_400(self, handler, patch_kv):
        resp = handler.handle(make_request("DELETE"))
        _, status = parse_response(resp)
        assert status == 400


class TestMethodNotAllowed:
    def test_patch_returns_405(self, handler, patch_kv):
        resp = handler.handle(make_request("PATCH"))
        _, status = parse_response(resp)
        assert status == 405
