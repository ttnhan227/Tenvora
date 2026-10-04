# Google Play release

The Android application ID is `com.tenvora.app`. Google Play treats this value as permanent after the first upload.

## 1. Production prerequisites

- Deploy the API on a public HTTPS URL and keep `/api/health/ready` healthy.
- Add the production web/server Google OAuth client ID to the API configuration.
- In Google Cloud, create an Android OAuth client for package `com.tenvora.app` and the SHA-1 of the upload key (and later the Play App Signing key).
- Host a public privacy policy and complete Play Console's Data safety and account-deletion declarations.
- Keep the upload key, its passwords, and `android/key.properties` in a password manager/secure backup. They are intentionally ignored by Git.

## 2. Upload signing

Create `mobile/android/tenvora-upload-key.jks`, then create `mobile/android/key.properties` from `key.properties.example`. The configured store path is relative to `android/app`, so the example value `../tenvora-upload-key.jks` points to the correct file.

To inspect the SHA-1 used for the Google Android OAuth client, run from the repository root after creating the key:

```sh
docker compose --profile tools run --rm --entrypoint keytool mobile-tools -list -v -keystore /workspace/mobile/android/tenvora-upload-key.jks -alias upload
```

## 3. Build the signed app bundle

Increment `version:` in `pubspec.yaml` for every Play upload, then run:

```sh
docker compose --profile tools run --rm mobile-tools android-bundle \
  --dart-define=API_BASE_URL=https://api.your-domain.com/api \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

The signed bundle is written to `mobile/build/app/outputs/bundle/release/app-release.aab`. The release action refuses to run without `android/key.properties`; `android-bundle-verify` exists only for CI-style compilation with the debug key.

## 4. Play Console

Enable Play App Signing, upload the AAB to Internal testing first, add store copy/screenshots/icon/privacy-policy URL, complete content rating and Data safety, and test install/login/business mutations on a physical Android device before promoting to production.
