#!/usr/bin/env bash
set -euo pipefail

flutter_version="${FLUTTER_VERSION:-3.47.5}"
command_line_tools_version="${ANDROID_COMMAND_LINE_TOOLS:-15859902}"
command_line_tools_sha256="${ANDROID_COMMAND_LINE_TOOLS_SHA256:-4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583}"

install_flutter() {
  if [[ -x "$FLUTTER_HOME/bin/flutter" ]]; then
    return
  fi

  echo "Installing Flutter ${flutter_version} into the Docker volume..."
  archive="/tmp/flutter.tar.xz"
  curl --fail --location --retry 20 --retry-delay 2 --retry-all-errors \
    --output "$archive" \
    "https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_${flutter_version}-stable.tar.xz"
  rm -rf /opt/flutter-sdk/flutter
  mkdir -p /opt/flutter-sdk
  tar -xJf "$archive" -C /opt/flutter-sdk
  rm -f "$archive"
  git config --global --add safe.directory "$FLUTTER_HOME"
  flutter config --no-analytics
}

install_android() {
  if [[ -d "$ANDROID_HOME/platforms/android-36" && -d "$ANDROID_HOME/build-tools/36.0.0" && -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]]; then
    return
  fi

  if [[ ! -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]]; then
    echo "Installing Android command-line tools into the Docker volume..."
    archive="/tmp/android-command-line-tools.zip"
    curl --fail --location --retry 20 --retry-delay 2 --retry-all-errors \
      --output "$archive" \
      "https://dl.google.com/android/repository/commandlinetools-linux-${command_line_tools_version}_latest.zip"
    echo "${command_line_tools_sha256}  ${archive}" | sha256sum -c -
    rm -rf "$ANDROID_HOME/cmdline-tools/latest" /tmp/android-command-line-tools
    mkdir -p "$ANDROID_HOME/cmdline-tools/latest" /tmp/android-command-line-tools
    unzip -q "$archive" -d /tmp/android-command-line-tools
    mv /tmp/android-command-line-tools/cmdline-tools/* "$ANDROID_HOME/cmdline-tools/latest/"
    rm -rf "$archive" /tmp/android-command-line-tools
  fi

  yes | sdkmanager --licenses >/dev/null || true
  sdkmanager \
    "platform-tools" \
    "platforms;android-36" \
    "build-tools;36.0.0" \
    "ndk;28.2.13676358"
  flutter config --android-sdk "$ANDROID_HOME" --no-analytics
  flutter precache --android
}

install_flutter
git config --global --add safe.directory "$FLUTTER_HOME"

case "${1:-verify}" in
  verify)
    flutter pub get
    dart format --set-exit-if-changed lib test
    flutter analyze
    flutter test
    ;;
  android-debug)
    shift
    install_android
    flutter build apk --debug "$@"
    ;;
  android-device)
    shift
    install_android
    flutter build apk --debug --target-platform=android-arm64 "$@"
    ;;
  android-bundle)
    shift
    if [[ ! -f android/key.properties ]]; then
      echo "android/key.properties is required for a Play Store bundle." >&2
      echo "See mobile/PLAY_RELEASE.md to create and back up the upload key." >&2
      exit 2
    fi
    production_api=""
    google_client_id=""
    for argument in "$@"; do
      case "$argument" in
        --dart-define=API_BASE_URL=*) production_api="${argument#--dart-define=API_BASE_URL=}" ;;
        --dart-define=GOOGLE_SERVER_CLIENT_ID=*) google_client_id="${argument#--dart-define=GOOGLE_SERVER_CLIENT_ID=}" ;;
      esac
    done
    if [[ ! "$production_api" =~ ^https:// ]] ||
       [[ "$production_api" =~ (example\.com|invalid|localhost|127\.0\.0\.1|10\.0\.2\.2) ]]; then
      echo "A real HTTPS API_BASE_URL is required for a Play Store bundle." >&2
      exit 2
    fi
    if [[ ! "$google_client_id" =~ \.apps\.googleusercontent\.com$ ]]; then
      echo "A production GOOGLE_SERVER_CLIENT_ID is required for a Play Store bundle." >&2
      exit 2
    fi
    install_android
    flutter pub get
    flutter build appbundle --release "$@"
    ;;
  android-bundle-verify)
    shift
    install_android
    flutter pub get
    ORG_GRADLE_PROJECT_allowDebugReleaseSigning=true \
      flutter build appbundle --release "$@"
    ;;
  bootstrap-android)
    install_android
    flutter doctor -v
    ;;
  *)
    exec "$@"
    ;;
esac
