# Tenvora Mobile

Native Flutter client for the Tenvora API. It mirrors the web workspace while using mobile-native navigation, compact cards, bottom sheets, secure credential storage, camera/gallery receipts, pull-to-refresh, and bilingual English/Vietnamese copy.

## Docker-first workflow

No host Flutter installation is required. From the repository root, run validation through the tool container:

```sh
docker compose --profile tools run --rm mobile-tools
```

The repository-owned tool container pins Flutter 3.47.5. Flutter, Android, Pub, and Gradle caches live in named volumes so Docker does not duplicate the multi-gigabyte SDKs into image-export layers.

Build a debug or release Android package through the same container:

```sh
docker compose --profile tools run --rm mobile-tools android-debug \
  --dart-define=API_BASE_URL=http://10.0.2.2:5000/api \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
docker compose --profile tools run --rm mobile-tools android-bundle --dart-define=API_BASE_URL=https://api.your-domain.com/api --dart-define=GOOGLE_SERVER_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

The generated Android artifact is written under `mobile/build/app/outputs/`. iOS project generation and analysis work in Docker; signing and producing an IPA still require macOS/Xcode because Apple does not provide the iOS build toolchain for Linux containers.

- Android `AndroidManifest.xml`: `INTERNET` and `CAMERA`. The system photo picker does not require broad media access.
- iOS `Info.plist`: `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription`.

## API endpoints

The app uses an Android-emulator-friendly default of `http://10.0.2.2:5000/api` and `http://127.0.0.1:5000/api` elsewhere. Override it for devices or production:

```sh
flutter run --dart-define=API_BASE_URL=https://api.example.com/api
```

For Google authentication, also supply the OAuth web/server client ID used by the API and complete the standard Android/iOS package configuration:

```sh
--dart-define=GOOGLE_SERVER_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Use HTTPS outside local development. Access and refresh credentials are stored with `flutter_secure_storage`.

The Android application ID and iOS bundle identifier are both `com.tenvora.app`.
See `PLAY_RELEASE.md` for signing, OAuth, and Play Console release steps.

## Feature map

- Email/Google login, registration, refresh rotation, onboarding, logout
- Home dashboard, period summaries, debt watchlist, recent activity
- Customers, account payments, archive/delete behavior, with statement API support
- Products, inventory adjustments, low-stock status, with image API support
- Sales, line items, initial/follow-up payments, reversals and voids
- Suppliers and purchases, with invoice-image and supplier-payment API support
- Expenses and receipt photos
- Reports, AI Agent conversations/actions, CSV import
- Team, audit history, workspace settings, language and theme controls
