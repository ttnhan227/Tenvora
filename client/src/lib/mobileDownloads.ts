export const APK_DOWNLOAD_URL = "https://github.com/ttnhan227/Tenvora/releases/download/mobile-latest/tenvora-mobile.apk";

export function resolvePlayStoreUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "play.google.com" || url.pathname !== "/store/apps/details" || url.searchParams.get("id") !== "com.tenvora.app" || url.username || url.password) return undefined;
    return url.href;
  } catch { return undefined; }
}
export const PLAY_STORE_URL = resolvePlayStoreUrl(import.meta.env.VITE_GOOGLE_PLAY_URL);
export const MOBILE_INSTALL_URL = PLAY_STORE_URL ?? APK_DOWNLOAD_URL;
