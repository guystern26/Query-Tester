### 18. API Layer


| Endpoint | Purpose |
| --- | --- |
| POST /splunkd/.../run_test | Execute test with full payload. |
| GET /splunkd/.../saved/searches?app={app} | List saved searches for app. |
| GET /splunkd/.../saved/searches/{name} | Get SPL of specific saved search. |
| GET /splunkd/.../apps/local | List available Splunk apps. |
| POST {LLM_ENDPOINT} | Send SPL for AI field extraction / validation suggestion. |

Typed errors (ApiError), AbortController for cancellation, no simulate functions in production (moved to mocks/ with MSW).