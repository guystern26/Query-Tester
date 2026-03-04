/**
 * Static mock TestResponse fixtures for deterministic testing.
 * TODO: Remove when real API is connected.
 */

import type { TestResponse } from 'core/types';

export const MOCK_ALL_PASS: TestResponse = {
  status: 'success',
  message: 'All 2 scenarios passed',
  testName: 'Login Monitoring Test',
  testType: 'standard',
  timestamp: new Date().toISOString(),
  executionTimeMs: 1847,
  errors: [],
  warnings: [],
  queryInfo: {
    executedQuery: 'index=main sourcetype=syslog | stats count by host, status',
    executionTimeMs: 1632,
    resultCount: 15,
    scanCount: 34521,
    earliestTime: '2024-01-15T00:00:00Z',
    latestTime: '2024-01-15T23:59:59Z',
  },
  summary: {
    totalScenarios: 2, passedScenarios: 2, failedScenarios: 0,
    totalInputs: 3, totalEvents: 6, validationType: 'standard',
  },
  scenarioResults: [
    {
      scenarioId: 'mock-s1', scenarioName: 'Normal Traffic',
      passed: true, inputsProcessed: 2, inputsPassed: 2,
      inputResults: [
        {
          inputId: 'mock-i1', passed: true, eventsValidated: 3, eventsPassed: 3,
          eventResults: [
            { eventIndex: 0, passed: true, fieldValidations: [
              { field: 'status', passed: true, expected: 'active', actual: 'active', message: 'Match' },
              { field: 'count', passed: true, expected: '100', actual: '150', message: 'count > 100: passed' },
            ] },
            { eventIndex: 1, passed: true, fieldValidations: [
              { field: 'status', passed: true, expected: 'active', actual: 'active', message: 'Match' },
              { field: 'count', passed: true, expected: '100', actual: '200', message: 'count > 100: passed' },
            ] },
            { eventIndex: 2, passed: true, fieldValidations: [
              { field: 'status', passed: true, expected: 'active', actual: 'active', message: 'Match' },
              { field: 'count', passed: true, expected: '100', actual: '300', message: 'count > 100: passed' },
            ] },
          ],
          executionTimeMs: 342,
        },
        {
          inputId: 'mock-i2', passed: true, eventsValidated: 1, eventsPassed: 1,
          eventResults: [
            { eventIndex: 0, passed: true, fieldValidations: [
              { field: 'status', passed: true, expected: 'active', actual: 'active', message: 'Match' },
            ] },
          ],
          executionTimeMs: 128,
        },
      ],
    },
    {
      scenarioId: 'mock-s2', scenarioName: 'Edge Case — Empty Input',
      passed: true, inputsProcessed: 1, inputsPassed: 1,
      inputResults: [
        {
          inputId: 'mock-i3', passed: true, eventsValidated: 2, eventsPassed: 2,
          eventResults: [
            { eventIndex: 0, passed: true, fieldValidations: [
              { field: 'count', passed: true, expected: '0', actual: '0', message: 'count equals 0: passed' },
            ] },
            { eventIndex: 1, passed: true, fieldValidations: [
              { field: 'count', passed: true, expected: '0', actual: '0', message: 'count equals 0: passed' },
            ] },
          ],
          executionTimeMs: 95,
        },
      ],
    },
  ],
};

export const MOCK_PARTIAL_FAIL: TestResponse = {
  status: 'partial',
  message: '1 of 2 scenarios passed',
  testName: 'Brute Force Detection',
  testType: 'standard',
  timestamp: new Date().toISOString(),
  executionTimeMs: 2341,
  errors: [],
  warnings: [
    {
      code: 'JOIN_LIMIT', message: 'Join limited to 50,000 results.',
      severity: 'warning', source: 'join', line: 3,
      tip: 'Consider using append with stats instead of join.',
    },
  ],
  queryInfo: {
    executedQuery: 'index=main sourcetype=access | stats count by src_ip | where count > 50',
    executionTimeMs: 2100, resultCount: 8, scanCount: 128000,
  },
  summary: {
    totalScenarios: 2, passedScenarios: 1, failedScenarios: 1,
    totalInputs: 2, totalEvents: 4, validationType: 'standard',
  },
  scenarioResults: [
    {
      scenarioId: 'mock-s1', scenarioName: 'Normal User',
      passed: true, inputsProcessed: 1, inputsPassed: 1,
      inputResults: [{
        inputId: 'mock-i1', passed: true, eventsValidated: 2, eventsPassed: 2,
        eventResults: [
          { eventIndex: 0, passed: true, fieldValidations: [
            { field: 'count', passed: true, expected: '50', actual: '3', message: 'count < 50: passed' },
          ] },
          { eventIndex: 1, passed: true, fieldValidations: [
            { field: 'count', passed: true, expected: '50', actual: '7', message: 'count < 50: passed' },
          ] },
        ],
        executionTimeMs: 450,
      }],
    },
    {
      scenarioId: 'mock-s2', scenarioName: 'Attacker',
      passed: false, inputsProcessed: 1, inputsPassed: 0,
      inputResults: [{
        inputId: 'mock-i2', passed: false, eventsValidated: 2, eventsPassed: 0,
        eventResults: [
          { eventIndex: 0, passed: false, fieldValidations: [
            { field: 'count', passed: false, expected: '50', actual: '150', message: 'Expected count < 50 but got 150' },
            { field: 'status', passed: false, expected: 'blocked', actual: 'active', message: 'Expected "blocked" but got "active"' },
          ] },
          { eventIndex: 1, passed: false, fieldValidations: [
            { field: 'count', passed: false, expected: '50', actual: '200', message: 'Expected count < 50 but got 200' },
            { field: 'status', passed: true, expected: 'blocked', actual: 'blocked', message: 'Match' },
          ] },
        ],
        executionTimeMs: 380,
      }],
    },
  ],
};

export const MOCK_FATAL_ERROR: TestResponse = {
  status: 'error',
  message: 'Test failed due to query error',
  testName: 'Broken Query Test',
  testType: 'standard',
  timestamp: new Date().toISOString(),
  executionTimeMs: 450,
  errors: [
    {
      code: 'UNKNOWN_COMMAND',
      message: 'Unknown search command "statss". Did you mean "stats"?',
      severity: 'fatal', source: 'statss', line: 2,
      tip: 'Check your SPL syntax. Common commands: stats, eval, where, table, rename.',
    },
  ],
  warnings: [],
  queryInfo: {
    executedQuery: 'index=main | statss count by host',
    executionTimeMs: 230, resultCount: 0, scanCount: 0,
  },
  summary: {
    totalScenarios: 0, passedScenarios: 0, failedScenarios: 0,
    totalInputs: 0, totalEvents: 0, validationType: 'standard',
  },
  scenarioResults: [],
};
