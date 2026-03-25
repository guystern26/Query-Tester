# spec-20 — Implementation Status

## Status: Maintenance & Enhancement Phase

All core features are implemented and operational. The project is in a
maintenance/enhancement phase.

## Completed Features

1. **Core test runner** — manual runs via builder page. Full run loop: parse, analyze,
   generate, index, inject, execute, validate, cleanup.

2. **Test library** — save, load, delete, clone test definitions. KVStore-backed with
   ownership enforcement and optimistic locking.

3. **Scheduled tests with cron** — cron-based scheduling backed by Splunk saved searches.
   60-second polling via scripted input. Managed from Library page schedule modal.

4. **Run history** — per-test run records with scenario-level results. Last 50 runs
   shown. Nightly janitor trims to 20 per test.

5. **SPL drift detection** — compares current saved search SPL against stored snapshot.
   Amber warning in builder with reload option. Detected at load time and during
   scheduled runs.

6. **Email alerts on failure** — single email to all recipients on scheduled test failure.
   Auto-inferred TLS mode from port. Configurable via Setup page.

7. **Bug report emails** — sends bug/feature request with importable test JSON attachment.
   Uses version 2 import format.

8. **Admin Setup page** — sections: Splunk connection, HEC, Email/SMTP, LLM, Logging,
   Command Policy. Auto-detection pre-fills most fields. Connectivity testing for
   HEC and SMTP.

9. **AI field extraction** — LLM-powered extraction for data source fields and
   validation condition fields.

10. **Interactive tutorial overlay** — guided walkthrough for new users.

11. **Optimistic locking** — version-based concurrency protection on save and schedule
    operations. 409 Conflict on version mismatch.

12. **Auth & ownership enforcement** — role-based admin check via session token. Owners
    can modify their own tests; admins bypass ownership checks.

13. **Event generator** — 7 generator types: numbered, pick_list, email, ip_address,
    unique_id, random_number, general_field.

14. **SPL linting** — client-side dangerous command detection with Ace editor markers.
    Backend command policy for admin-configurable enforcement.

15. **Import/export** — version 2 format test definitions. Import validates and
    upgrades from version 1.

## Known Constraints

- **CI/CD integration** — not yet implemented. Planned: `runByTestId` endpoint for
  pipeline automation with placeholder string-replace convention.

- **Dark mode only** — no light mode support. All styling uses the navy/slate palette.

- **No real-time collaboration** — concurrent edits handled via optimistic locking
  (409 Conflict), not live sync.
