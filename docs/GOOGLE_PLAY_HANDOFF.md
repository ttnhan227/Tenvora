# Google Play release handoff

Tenvora remains version **1.0.0**, application ID `com.tenvora.app`. Preparing a bundle does not publish it. The owner handles Play Console uploads and approval.

## Build and evidence

The `Prepare verified Google Play bundle` manual GitHub workflow builds a signed `.aab` after backend, PostgreSQL, web and mobile verification. Use an unused version code; `1` is appropriate only if it has never been uploaded to this Play app. The artifact includes a checksum, manifest, signing certificate report and native-library verification receipt. No Play credentials are required by this workflow.

Release configuration requires the public HTTPS API URL and Google server client ID. The upload certificate must match `mobile/android/signing-certificate.sha256`. The bundle targets API 36, disables credential backups and cleartext traffic, and is checked for 16 KB packaging and 64-bit ELF alignment. Those static checks do not replace testing on a real 16 KB Android device or emulator.

## Before uploading

The prepared listing files, feature graphics, icon and actual Android screenshots are in `release/google-play/`. Read its README and run `python release/google-play/validate_assets.py` after editing assets. `ANDROID_RELEASE_ACCEPTANCE.md` records the installed-app checks and their limits.

- Deploy the matching backend and website changes. Verify `/privacy` and `/delete-account` publicly, and test account deletion with a disposable account. The new bundle's deletion and AI-reporting endpoints require the updated backend.
- Public support and privacy contact: `ccleemon227@gmail.com`. Use the same contact in Play Console. The website defaults to this owner-approved address; `VITE_SUPPORT_EMAIL` can override it at build time.
- In Play App Signing, register the **Play app-signing certificate** SHA-1/SHA-256 with the Android OAuth configuration for `com.tenvora.app`. It may differ from the upload certificate. Test Google sign-in on the version installed through Play testing.
- Supply a review account with synthetic business data and instructions to reach protected functionality. Never provide personal or production customer data.
- Complete the store description, icon, screenshots, content rating, target audience, app access, ads declaration and Data safety answers. Disclose account/profile and business data, selected photos and AI conversations, the Google/Gemini processing actually used, deletion behavior, and hosting providers. Check current Console prompts against the actual release; do not copy an assumed declaration.
- Run Play's pre-launch report and test installation, cold start, sign-in/out, receipt capture/selection, financial retries after lost connectivity, language/text scaling, account deletion and upgrades preserving data.
- If Play requires closed testing before production access, complete that requirement and apply for access. Identity verification alone does not grant production access.

## Account deletion behavior

Settings and the public web deletion page require the signed-in account's exact email. A sole member's workspace, financial records and photos are erased. In a shared workspace, personal credentials/profile/AI conversations are erased; shared records remain with actor identity removed. A final active administrator must appoint another active administrator before leaving a team. Existing provider backups follow provider retention; do not promise instantaneous backup erasure.

## AI response reports

Mobile assistant replies include an in-app report action. The server saves reports against only the reporter's own conversation and logs message/tenant IDs without reply or business content. Review reports routinely in restricted database access:

```sql
SELECT "TenantId", "EntityId", "Notes", "Timestamp"
FROM "AuditLogs"
WHERE "EntityType" = 'AiMessageReport'
ORDER BY "Timestamp" DESC;
```

Resolve the message ID against the matching tenant's `AiConversationMessages` using restricted access. Investigate unsafe replies, adjust provider safety/prompt behavior, and add regression coverage. Reports are not automatically emailed or reviewed by an external moderation service.

## Known operational limits

Production backup/restore scheduling and alerts were explicitly deferred by the owner; prior isolated restore verification does not establish an active production recovery service. No fresh physical-device or Play-installed acceptance test is implied by automated tests. No Google Play upload or publication is performed by the readiness work.

Official references: [app bundles](https://support.google.com/googleplay/android-developer/answer/9859152), [account deletion](https://support.google.com/googleplay/android-developer/answer/13327111), [production access testing](https://support.google.com/googleplay/android-developer/answer/14151465), [target API](https://developer.android.com/google/play/requirements/target-sdk), [16 KB page sizes](https://developer.android.com/guide/practices/page-sizes).

## Current GCP replacement

The retained AAB and public APK include the confirmation fix and GCP API URL. See ANDROID_RELEASE_ACCEPTANCE.md for current hashes/workflow evidence and GCP_DEPLOYMENT.md for automated backend deployment. Google Gemini and Mistral fallback processing must both be disclosed in Play declarations.
