/**
 * snake_case ↔ camelCase mapping helpers for config API responses/requests.
 * Extracted from configApi.ts to keep files under 200 lines.
 */

import type { AppConfig, CommandPolicyEntry, ConnectionTestResult, EmailDetectResult } from 'core/types/config';
import { DESTRUCTIVE_COMMANDS } from 'core/constants/commandPolicy';

function snakeToCamel(s: string): string {
    return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelToSnake(s: string): string {
    return s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
}

function mapKeys<T>(obj: Record<string, unknown>, fn: (k: string) => string): T {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        result[fn(k)] = v;
    }
    return result as T;
}

export function mapConfigResponse(raw: Record<string, unknown>): AppConfig {
    const detected = (raw._detected || raw['_detected'] || []) as string[];
    const secrets = {
        splunkPassword: { set: Boolean((raw.splunk_password as Record<string, boolean>)?.set) },
        hecToken: { set: Boolean((raw.hec_token as Record<string, boolean>)?.set) },
        smtpPassword: { set: Boolean((raw.smtp_password as Record<string, boolean>)?.set) },
        oauthClientSecret: { set: Boolean((raw.oauth_client_secret as Record<string, boolean>)?.set) },
        emailApiKey: { set: Boolean((raw.email_api_key as Record<string, boolean>)?.set) },
        llmApiKey: { set: Boolean((raw.llm_api_key as Record<string, boolean>)?.set) },
    };

    return {
        splunkHost: String(raw.splunk_host || ''),
        splunkPort: String(raw.splunk_port || ''),
        splunkScheme: (raw.splunk_scheme || 'http') as AppConfig['splunkScheme'],
        splunkUsername: String(raw.splunk_username || ''),
        splunkWebUrl: String(raw.splunk_web_url || ''),
        hecHost: String(raw.hec_host || ''),
        hecPort: String(raw.hec_port || ''),
        hecScheme: (raw.hec_scheme || 'https') as AppConfig['hecScheme'],
        hecSslVerify: raw.hec_ssl_verify === 'true' || raw.hec_ssl_verify === true,
        hecTimeout: String(raw.hec_timeout || ''),
        tempIndex: String(raw.temp_index || ''),
        tempSourcetype: String(raw.temp_sourcetype || ''),
        emailAuthMethod: (raw.email_auth_method || 'none') as AppConfig['emailAuthMethod'],
        smtpServer: String(raw.smtp_server || ''),
        smtpPort: String(raw.smtp_port || ''),
        mailFrom: String(raw.mail_from || ''),
        mailTo: String(raw.mail_to || ''),
        defaultAlertEmail: String(raw.default_alert_email || ''),
        smtpUsername: String(raw.smtp_username || ''),
        oauthTenantId: String(raw.oauth_tenant_id || ''),
        oauthClientId: String(raw.oauth_client_id || ''),
        emailProvider: String(raw.email_provider || ''),
        emailApiEndpoint: String(raw.email_api_endpoint || ''),
        llmEndpoint: String(raw.llm_endpoint || ''),
        llmModel: String(raw.llm_model || ''),
        llmMaxTokens: String(raw.llm_max_tokens || ''),
        maxParallelTests: String(raw.max_parallel_tests || ''),
        logLevel: (raw.log_level || 'INFO') as AppConfig['logLevel'],
        logFile: String(raw.log_file || ''),
        _detected: detected.map(snakeToCamel),
        secrets,
    };
}

export function mapPolicyEntry(raw: Record<string, unknown>): CommandPolicyEntry {
    const command = String(raw.command || '');
    return {
        id: crypto.randomUUID(),
        command,
        severity: (raw.severity || 'warning') as CommandPolicyEntry['severity'],
        label: String(raw.label || ''),
        allowed: raw.allowed === 'true' || raw.allowed === true,
        isDefault: raw.is_default === 'true' || raw.is_default === true,
        isDestructive: DESTRUCTIVE_COMMANDS.includes(command),
    };
}

export function policyEntryToSnake(entry: CommandPolicyEntry): Record<string, unknown> {
    return {
        command: entry.command,
        severity: entry.severity,
        label: entry.label,
        allowed: entry.allowed ? 'true' : 'false',
        is_default: entry.isDefault ? 'true' : 'false',
    };
}

export function plainToSnake(plain: Partial<AppConfig>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(plain)) {
        if (k === '_detected' || k === 'secrets') continue;
        result[camelToSnake(k)] = v;
    }
    return result;
}

export function secretsToSnake(secrets: Record<string, string>): Record<string, string> {
    return mapKeys<Record<string, string>>(secrets, camelToSnake);
}

export function mapConnectionResult(raw: Record<string, unknown>): ConnectionTestResult {
    return {
        hec: (raw.hec || 'error') as ConnectionTestResult['hec'],
        hecDetail: String(raw.hec_detail || ''),
        smtp: (raw.smtp || 'error') as ConnectionTestResult['smtp'],
        smtpDetail: String(raw.smtp_detail || ''),
        tlsMode: (raw.tls_mode || null) as ConnectionTestResult['tlsMode'],
    };
}

export function mapEmailDetectResult(raw: Record<string, unknown>): EmailDetectResult {
    const result: EmailDetectResult = {
        source: (raw.source || 'none') as EmailDetectResult['source'],
    };
    if (raw.smtp_server) result.smtpServer = String(raw.smtp_server);
    if (raw.smtp_port) result.smtpPort = String(raw.smtp_port);
    if (raw.mail_from) result.mailFrom = String(raw.mail_from);
    if (raw.smtp_username) result.smtpUsername = String(raw.smtp_username);
    if (raw.email_auth_method) {
        result.emailAuthMethod = raw.email_auth_method as EmailDetectResult['emailAuthMethod'];
    }
    return result;
}

export function camelToSnakeKey(name: string): string {
    return camelToSnake(name);
}
