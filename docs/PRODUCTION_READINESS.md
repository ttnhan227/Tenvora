# Tenvora readiness — 4 October 2026

The actionable repository gaps were repaired. A production launch still needs account/device and operational acceptance. No public APK release was requested or published during this repair.

## Completed

- Fixed browser fixtures: valid expiring test tokens, onboarding state, paginated sales responses, and persisted AI conversations. All six browser workflows pass, including sales/payments and action persistence.
- Backend: 100 tests passed, including migrations, simultaneous payments, duplicate retries, and application tenant boundaries on isolated PostgreSQL. An additional opt-in live AI test passed for both chat and the agent with synthetic data.
- Web: 64 tests and production build passed; lint has zero errors and zero warnings. Async subscriptions now read current state.
- Flutter: analysis found no issues; all four mobile tests passed through Docker.
- Verified synthetic PostgreSQL backup/restore. Added a deployment/recovery runbook.
- Mobile and manual Render workflows now require backend/web/PostgreSQL/browser verification. Pushes produce APK artifacts, not public releases. Mobile tests run before building.
- Configured GitHub Android signing secrets securely from the existing local upload keystore. Signed APKs must match the checked-in public certificate fingerprint. Publication requires signing, HTTPS, and Google configuration.
- Gemini credentials use request headers, not URLs. Answer handling excludes internal reasoning and combines text parts; provider error bodies are not logged by the agent.
- The currently deployed backend readiness endpoint returned HTTP 200.

## Requires your account, device, or decision

1. Verify Google's Android client for `com.tenvora.app` uses SHA-1 `EA:49:3F:D3:A0:32:E0:A2:CE:5C:A1:D3:EA:6B:1A:48:D7:38:0A:67`, then complete real Google sign-in on the distributed app.
2. Test a clean installation and update on an actual phone, including camera receipts, network loss, session refresh, and a payment retry. An older debug-signed APK cannot be updated in place with a different distribution certificate; test upgrade continuity before offering it to users.
3. Configure and verify production backups/restore and the alert recipient in your hosting account. The synthetic restore test does not establish that production backups exist.
4. Decide whether Render should auto-deploy. Its dashboard setting is independent of GitHub's now-manual deploy hook; disable provider auto-deploy if deployment must await your approval.
5. Accept the product's everyday workflows and explicitly request publication when ready.

Tenant isolation is enforced in application services. The migrations do not create database RLS policies; this repair does not claim that a hosted PostgreSQL owner role enforces RLS. See [operations](OPERATIONS.md).

Physical phone and Google account verification cannot be replaced by mock browser tests. Production settings remain external to this checkout.
