import type { TestDefinition, TestInput, InputEvent } from 'core/types';
import type { CommandPolicyEntry } from 'core/types/config';

function hasMissingRowIdentifier(input: TestInput): boolean {
  return input.rowIdentifier.trim() === '';
}

function hasValueWithoutFieldName(events: InputEvent[]): boolean {
  return events.some((evt) =>
    evt.fieldValues.some((fv) => fv.field.trim() === '' && fv.value.trim() !== '')
  );
}

function hasInvalidJson(input: TestInput): boolean {
  if (input.inputMode !== 'json') return false;
  const text = input.jsonContent.trim();
  if (!text) return false;
  try {
    JSON.parse(text);
    return false;
  } catch {
    return true;
  }
}

export function validateBeforeRun(
  test: TestDefinition,
  commandPolicy?: CommandPolicyEntry[],
): string[] {
  const errors: string[] = [];

  if (!test.app || test.app.trim() === '') {
    errors.push('App name is required before running the test.');
  }

  if (!test.query.spl || test.query.spl.trim() === '') {
    errors.push('SPL query is required before running the test.');
  }

  // Check command policy
  if (commandPolicy && commandPolicy.length > 0 && test.query.spl) {
    const blockedCommands = commandPolicy
      .filter((e) => !e.allowed)
      .map((e) => e.command.toLowerCase());
    const splLower = test.query.spl.toLowerCase();
    const foundBlocked = blockedCommands.filter((cmd) =>
      new RegExp('\\b' + cmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(splLower)
    );
    if (foundBlocked.length > 0) {
      errors.push(
        'Query contains blocked command' + (foundBlocked.length > 1 ? 's' : '') + ': ' +
        foundBlocked.map((c) => '`' + c + '`').join(', ') +
        '. Contact your Splunk administrator.'
      );
    }
  }

  // Scenario / input validations only apply to standard mode
  if (test.testType !== 'query_only') {
    for (const scenario of test.scenarios) {
      for (const input of scenario.inputs) {
        if (hasMissingRowIdentifier(input)) {
          errors.push('Every input must have a row identifier.');
          break;
        }
      }
    }

    for (const scenario of test.scenarios) {
      for (const input of scenario.inputs) {
        if (hasValueWithoutFieldName(input.events)) {
          errors.push('Field values cannot have a value without a field name.');
          break;
        }
      }
    }

    for (const scenario of test.scenarios) {
      for (const input of scenario.inputs) {
        if (hasInvalidJson(input)) {
          errors.push('One or more inputs contain invalid JSON.');
          break;
        }
      }
    }

    for (const scenario of test.scenarios) {
      for (const input of scenario.inputs) {
        if (input.inputMode === 'query_data' && !input.queryDataConfig.spl.trim()) {
          errors.push('Query Data input in "' + (scenario.name || 'Scenario') + '" has an empty sub-query.');
          break;
        }
      }
    }

    for (const scenario of test.scenarios) {
      for (const input of scenario.inputs) {
        const cfg = input.generatorConfig;
        if (!cfg.enabled) continue;
        if (cfg.rules.length === 0) {
          errors.push('Event generator is enabled but has no rules configured.');
          break;
        }
        if (cfg.rules.some((r) => !r.field.trim())) {
          errors.push('One or more generator rules are missing a field name.');
          break;
        }
        if (cfg.rules.some((r) => !r.type)) {
          errors.push('One or more generator rules are missing a type.');
          break;
        }
      }
    }
  }

  return errors;
}

