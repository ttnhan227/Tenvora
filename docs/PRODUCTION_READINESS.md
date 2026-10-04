# Tenvora readiness — 4 October 2026

The actionable repository gaps were repaired. On 4 October 2026, the owner approved Tenvora for release after the device checks below. Production backups/restore and alert setup were explicitly deferred and remain outstanding.

## Completed

- Fixed browser fixtures: valid expiring test tokens, onboarding state, paginated sales responses, and persisted AI conversations. All seven browser workflows pass, including sales/payments, action persistence, and light/dark form styling.
- Backend: 100 tests passed, including migrations, simultaneous payments, duplicate retries, and application tenant boundaries on isolated PostgreSQL. An additional opt-in live AI test passed for both chat and the agent with synthetic data.
- Web: 64 tests and production build passed; lint has zero errors and zero warnings. Async subscriptions now read current state.
- Late conversation responses cannot overwrite a newly created AI action form. A delayed-response browser check verifies that entered customer details survive and remain executable.
- Updated Axios and the CSS build toolchain to remove vulnerable dependencies. Tailwind 4 uses the migrated theme and compatible utility classes; the obsolete Bun lockfile was removed. npm audit reports zero vulnerabilities, including development dependencies. HIGH/CRITICAL vulnerability and credential scans gate deployment and APK builds.
- Flutter: analysis found no issues; all eight mobile tests passed through Docker, including camera/gallery selection, cancellation, saved-photo viewing and zoom, and malformed-photo handling.
- Verified synthetic PostgreSQL backup/restore. Added a deployment/recovery runbook.
- Mobile and manual Render workflows now require backend/web/PostgreSQL/browser verification. Pushes produce APK artifacts, not public releases. Mobile tests run before building.
- Configured GitHub Android signing secrets securely from the existing local upload keystore. Signed APKs must match the checked-in public certificate fingerprint. Publication requires signing, HTTPS, and Google configuration.
- GitHub's [verified APK build](https://github.com/ttnhan227/Tenvora/actions/runs/37198621589) passed all gates, built the release APK, and confirmed that its signing certificate matches the distribution key. The APK is a workflow artifact; this run did not publish a GitHub Release. The [CI pipeline](https://github.com/ttnhan227/Tenvora/actions/runs/37198621585) also passed.
- Gemini credentials use request headers, not URLs. Answer handling excludes internal reasoning and combines text parts; provider error bodies are not logged by the agent.
- The currently deployed backend readiness endpoint returned HTTP 200.

## Owner acceptance — 4 October 2026

- Confirmed Google sign-in on the signed Android app after registering the distribution certificate in the existing Android OAuth client.
- Confirmed phone installation/update and receipt capture with both camera and gallery. Saved photos display when reopening records.
- Confirmed the same saved photo appears on the website in the same business account.
- Approved Tenvora's usability and explicitly requested a public release. Groundwork's usability review remains separate.
- Production backups/restore and alert setup were explicitly skipped by the owner. These safeguards remain outstanding; the synthetic restore test does not establish that production backups exist.
- Network-loss recovery, session refresh, and payment retries have automated coverage where described above, but were not separately confirmed in this physical-phone walkthrough.


Tenant isolation is enforced in application services. The migrations do not create database RLS policies; this repair does not claim that a hosted PostgreSQL owner role enforces RLS. See [operations](OPERATIONS.md).

Physical phone and Google account verification cannot be replaced by mock browser tests. Production settings remain external to this checkout.

## Public release — 4 October 2026

The owner-authorized [release workflow](https://github.com/ttnhan227/Tenvora/actions/runs/37214224634) passed and published the signed Android APK from `7a2fb74` to [Tenvora Mobile for Android](https://github.com/ttnhan227/Tenvora/releases/tag/mobile-latest). This includes the receipt photo preview, gallery selection, and zoom fixes that the owner tested.

Website download links now point directly to the GitHub release asset, including the QR/copy link. Render serves the corrected homepage and mobile page. The [website-fix CI](https://github.com/ttnhan227/Tenvora/actions/runs/37214369382) passed. Groundwork was not released by this operation.
