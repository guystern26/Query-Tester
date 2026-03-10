/**
 * Static mock TestResponse fixtures matching the backend response shape.
 * TODO: Remove when real API is connected.
 */

import type { TestResponse } from 'core/types';
import { EMPTY_SPL_ANALYSIS } from '../features/results/resultHelpers';

export const MOCK_ALL_PASS: TestResponse = {
  status: 'success',
  message: '2/2 scenarios passed',
  testName: 'Login Monitoring Test',
  testType: 'standard',
  timestamp: new Date().toISOString(),
  totalScenarios: 2,
  passedScenarios: 2,
  warnings: [],
  splAnalysis: { ...EMPTY_SPL_ANALYSIS, commandsUsed: ['search', 'stats'] },
  scenarioResults: [
    {
      scenarioName: 'Normal Traffic',
      passed: true,
      executionTimeMs: 342,
      resultCount: 15,
      injectedSpl: 'index=main sourcetype=syslog | where run_id="abc123" | stats count by host, status',
      validations: [
        { field: 'status', condition: 'equals', expected: 'active', actual: 'active', passed: true, message: 'status equals "active" \u2713' },
        { field: 'count', condition: 'greater_than', expected: '100', actual: '150', passed: true, message: 'count greater_than "100" \u2713' },
      ],
      resultRows: [{ host: 'web01', status: 'active', count: '150' }, { host: 'web02', status: 'active', count: '120' }],
      error: null,
    },
    {
      scenarioName: 'Edge Case \u2014 Empty Input',
      passed: true,
      executionTimeMs: 95,
      resultCount: 2,
      injectedSpl: 'index=main sourcetype=syslog | where run_id="def456" | stats count by host, status',
      validations: [
        { field: 'count', condition: 'equals', expected: '0', actual: '0', passed: true, message: 'count equals "0" \u2713' },
      ],
      resultRows: [],
      error: null,
    },
  ],
};

export const MOCK_PARTIAL_FAIL: TestResponse = {
  status: 'partial',
  message: '1/2 scenarios passed',
  testName: 'Brute Force Detection',
  testType: 'standard',
  timestamp: new Date().toISOString(),
  totalScenarios: 2,
  passedScenarios: 1,
  warnings: [
    { message: 'Join limited to 50,000 results.', severity: 'warning' },
  ],
  splAnalysis: { ...EMPTY_SPL_ANALYSIS, unusualCommands: ['join'], commandsUsed: ['search', 'stats', 'join', 'where'] },
  scenarioResults: [
    {
      scenarioName: 'Normal User',
      passed: true,
      executionTimeMs: 450,
      resultCount: 3,
      injectedSpl: 'index=main sourcetype=access | where run_id="ghi789" | stats count by src_ip | where count > 50',
      validations: [
        { field: 'count', condition: 'less_than', expected: '50', actual: '3', passed: true, message: 'count less_than "50" \u2713' },
      ],
      resultRows: [{ src_ip: '10.0.0.1', count: '3' }],
      error: null,
    },
    {
      scenarioName: 'Attacker',
      passed: false,
      executionTimeMs: 380,
      resultCount: 8,
      injectedSpl: 'index=main sourcetype=access | where run_id="jkl012" | stats count by src_ip | where count > 50',
      validations: [
        { field: 'count', condition: 'less_than', expected: '50', actual: '150', passed: false, message: 'count less_than "50" \u2014 got "150" \u2717' },
        { field: 'status', condition: 'equals', expected: 'blocked', actual: 'active', passed: false, message: 'status equals "blocked" \u2014 got "active" \u2717' },
      ],
      resultRows: [{ src_ip: '192.168.1.100', count: '150', status: 'active' }],
      error: null,
    },
  ],
};

export const MOCK_FATAL_ERROR: TestResponse = {
  status: 'error',
  message: 'Internal error while preparing test payload.',
  testName: 'Broken Query Test',
  testType: 'standard',
  timestamp: new Date().toISOString(),
  totalScenarios: 0,
  passedScenarios: 0,
  warnings: [],
  splAnalysis: EMPTY_SPL_ANALYSIS,
  scenarioResults: [],
};
