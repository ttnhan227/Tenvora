# Android 1.0.0 acceptance — October 7, 2026

Current APK source: `5cda8d1`; AAB app source: `10207f9` (confirmation fixes, seven languages and both-provider consent). The commits differ only in workflow/deployment documentation; application code is identical. Original installed-app checks below were performed on `6d24248`; the replacements additionally passed current CI and action-confirmation regression tests. Package `com.tenvora.app`, public version **1.0.0**, version code **1**.

## Retained releases

- Signed AAB: `mobile/build/play-release-ci/tenvora-1.0.0.aab`, 58,223,360 bytes. SHA-256 `bade52312c715b99c22ed61dcf91a1c5fdfe54506d425f248d4f699f229c4455`.
- Public signed APK: `https://github.com/ttnhan227/Tenvora/releases/download/mobile-latest/tenvora-mobile.apk`, 59,690,825 bytes. SHA-256 `4cf6765caf3b9237b71bd3376fd1c13406ad8ff1e4bdc3c1aff98446158b7568`.
- Successful workflows: bundle **37600601376**, APK publication **37601921852**, main CI/GCP deployment **37601855707**. Redundant artifact-only APK run was intentionally cancelled.
- Bundle verification checks the upload certificate, package/version, API 36 manifest, restricted permissions and eight native 64-bit libraries for 16 KB alignment/packaging.

## Product checks

- Original installed-build baseline: **46 mobile tests passed**, clean analysis and formatting. Every offered language has a complete bundled catalog; sign-in and settings were checked at 320 × 640 and 150% text scale.
- Local backend: **109 passed, five skipped**. Infrastructure/live-provider tests require their configured environment; shared release workflows also passed their PostgreSQL-backed product gate. Web unit/browser gates passed.
- Hosted synthetic reviewer login and an English read-only summary reached **Google Gemini** without an action proposal. Another Spanish request used the built-in fallback without a write proposal. Provider availability varies; do not claim every language/request works through the fallback.
- Actual signed Android release installed and started in an isolated Android 16/API 36 emulator. Replacement install preserved the session, stock (22), sales (USD 30), customer balance (USD 15), supplier balance (USD 10) and expense (USD 5).
- German selection survived force-stop/restart, displayed decimal commas and preserved financial values; English was restored for the listing captures.
- AI disclosure required agreement before the emulator request; summary values matched the synthetic shop. Markdown rendered as formatted text, with no remote image loading.
- Native camera denial displayed an inline retry/alternate-photo message inside the expense sheet. Its amount, description and date stayed intact; the form was cancelled without saving changes.
- Earlier installed-app checks covered offline/retry recovery, selected-photo add/remove, conversation history and reply-report navigation. Backend and mobile regressions retain coverage for these paths.

## Listing assets and limits

Six actual English phone captures are in `release/google-play/screenshots/en-US/`, with fictional records. Only RGB encoding conversion was applied; app content was not cropped, overlaid or fabricated. The icon and feature graphic are separate vector-derived promotional assets. `asset-receipt.json` records dimensions, PNG integrity, sizes and hashes; `ALT_TEXT.md` supplies descriptions.

The emulator uses **4 KB** pages. Static 16 KB checks do not establish runtime acceptance on a 16 KB device. Emulator testing does not establish physical-device, Play-installed Google sign-in, Play pre-launch approval, personal-account eligibility or production access. The owner still handles those checks and publication.

Production backup scheduling/alerts remain owner-deferred. Keep the review account available and monitor the approved support email. Google eligibility correspondence is drafted, not sent.

## Local update and cleanup

Final backend and frontend rebuilt successfully; API, web and PostgreSQL containers are healthy. The database volume was preserved. Flutter clean, .NET clean/build-server shutdown, and removal of the five unused Tenvora Docker toolchain volumes and tool image completed. Docker build-cache cleanup ran after the local update. The emulator is stopped. Automatic approval review rejected removal of `.audit/android-tools`; that temporary SDK/emulator folder remains and needs owner cleanup. Signing keys, reviewer credentials and final signed AAB/APK were preserved.

## Confirmation and GCP release verification

The replacement mobile build disables confirm/reject while an action is in flight and removes those buttons after resolution. Widget regression tests cover customer creation, expenses and supplier payments; current full mobile analysis, formatting and tests passed in both release workflows. Web confirmation handlers release their guards in finally, handle unexpected failures and settle successful proposals before refreshes. All 76 web unit tests passed, including double-click/retry coverage; the shared browser/PostgreSQL product gates passed.

GCP revision tenvora-api-00010-gmc serves the verified app source with 100% traffic. Database readiness and CORS checks passed; the synthetic review account logged in and a read-only request reached Google Gemini without an action proposal. Render's website uses GCP and publishes the Google/Mistral privacy disclosure. Gemini 3.5 Flash-Lite with Mistral fallback remains configured.

The retained APK and AAB both contain the GCP address in their compiled native app. The public APK has a matching checksum and tenvora-mobile.build.json provenance. Version stays 1.0.0/code 1. Public mobile-latest is a distribution channel; its Git ref is not treated as installer source. Automatic GCP deployment was exercised successfully with short-lived GitHub authentication. Fresh local services are healthy; 2.731 GB of Docker builder cache was reclaimed. The previously blocked temporary Android SDK folder still remains.
