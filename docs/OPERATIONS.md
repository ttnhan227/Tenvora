# Deployment and recovery

Pushes run checks and produce build artifacts. Public APK publication and the GitHub Render deploy hook require manually starting their workflows. Render's own auto-deploy setting is separate: disable it in the Render dashboard if every deployment should wait for your approval.

Before a public APK release, configure `MOBILE_API_BASE_URL`, `GOOGLE_SERVER_CLIENT_ID`, `ANDROID_KEY_PROPERTIES`, and `ANDROID_KEYSTORE_BASE64` in GitHub Actions. Keep the same upload keystore for updates. Verify the signed certificate's SHA fingerprint in Google's Android OAuth client. Release publication fails if signing secrets or sign-in configuration are missing.

The existing local upload key's public Android OAuth SHA-1 is `EA:49:3F:D3:A0:32:E0:A2:CE:5C:A1:D3:EA:6B:1A:48:D7:38:0A:67` for package `com.tenvora.app`. Publication checks the APK against the public SHA-256 fingerprint in `mobile/android/signing-certificate.sha256`. A key change requires a deliberate update and an upgrade-continuity review.

## Database verification

`TENVORA_TEST_DATABASE_URL` must point to an isolated PostgreSQL server on localhost with permission to create databases. Tests create and drop only their own uniquely named databases, apply every migration, and exercise concurrent payments, retry idempotency, and application tenant boundaries. CI supplies PostgreSQL automatically.

The application enforces tenant predicates. The request middleware sets a PostgreSQL tenant session value, but the checked-in migrations do **not** create row-level-security policies. Do not assume database RLS is enabled or that a Supabase owner/superuser role enforces it. Deployment-specific database roles and policies need their own reviewed configuration.

`scripts/verify-postgres-recovery.sh <isolated-container-id>` checks PostgreSQL custom-format backup and restore using synthetic records. CI runs it automatically. It does not export production data or establish your production backup policy.

## Production checklist

1. Enable automated backups at the database provider; choose retention and recovery-point/recovery-time targets. Keep an independent restore destination.
2. Before deploying a migration, take a recoverable snapshot and test the migration against a restored staging copy. Never delete the production schema to repair authentication.
3. Restore a production backup to an isolated staging database, then verify records, totals, accounts, and receipt images. Keep a record of when it was restored and how long recovery took.
4. Monitor `/api/health/ready` for database connectivity and `/api/health/live` for process availability. Configure an alert destination that you actually receive.
5. If a deployment fails, redeploy the prior application image. A prior image does not undo schema/data changes; restore or apply a reviewed forward repair when necessary.
6. Complete real Google sign-in and a phone install/upgrade test with the distribution key, including camera receipts, network loss, session refresh, and payment retries.

Financial records should only be used in production after these operational and device checks are accepted.
