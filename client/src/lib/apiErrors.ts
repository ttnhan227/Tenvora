import { translationsMap, type SupportedLanguage } from "@/locales";

export interface ApiErrorInfo {
  message: string;
  status?: number;
  code?: string;
  errors: string[];
  fieldErrors?: Record<string, string[]>;
  retryable: boolean;
}

interface ApiErrorShape {
  message?: string;
  code?: string;
  response?: {
    status?: number;
    data?: unknown;
  };
}

function resolveLocale(explicitLangOrIsVietnamese?: string | boolean): SupportedLanguage {
  if (typeof explicitLangOrIsVietnamese === "string" && explicitLangOrIsVietnamese in translationsMap) {
    return explicitLangOrIsVietnamese as SupportedLanguage;
  }
  if (explicitLangOrIsVietnamese === true) return "vi";
  if (explicitLangOrIsVietnamese === false) return "en";
  try {
    const saved = localStorage.getItem("tenvora_lang");
    if (saved && saved in translationsMap) return saved as SupportedLanguage;
  } catch {
    // Local storage can be unavailable in privacy-restricted contexts.
  }
  return "en";
}

function getTranslation(lang: SupportedLanguage, key: string, fallback: string): string {
  const dict = translationsMap[lang] || translationsMap.en;
  return dict[key] || translationsMap.en[key] || fallback;
}

function statusMessage(status: number | undefined, lang: SupportedLanguage, fallback: string): string {
  switch (status) {
    case 400:
    case 422:
      return getTranslation(lang, "error.status.400", "Some information is invalid. Check the fields and try again.");
    case 401:
      return getTranslation(lang, "error.status.401", "Your session has expired. Please sign in again.");
    case 403:
      return getTranslation(lang, "error.status.403", "You do not have permission to perform this action.");
    case 404:
      return getTranslation(lang, "error.status.404", "This record could not be found. It may have been removed or changed.");
    case 409:
      return getTranslation(lang, "error.status.409", "The data changed or conflicts with an existing record. Refresh and try again.");
    case 413:
      return getTranslation(lang, "error.status.413", "The file or request is too large. Choose a smaller file and try again.");
    case 429:
      return getTranslation(lang, "error.status.429", "Too many requests were sent. Wait a moment and try again.");
    case 502:
    case 503:
    case 504:
      return getTranslation(lang, "error.status.service_unavailable", "The service is temporarily unavailable. Check your records before retrying.");
    default:
      if (status && status >= 500) {
        return getTranslation(lang, "error.status.500", "The server could not complete the operation. Check your records before retrying.");
      }
      return fallback;
  }
}

function collectPayloadErrors(payload: unknown) {
  const fieldErrors: Record<string, string[]> = {};
  const errors: string[] = [];
  if (!payload || typeof payload !== "object") return { errors, fieldErrors };

  const raw = (payload as { errors?: unknown }).errors;
  if (Array.isArray(raw)) {
    errors.push(...raw.map(String).map((value) => value.trim()).filter(Boolean));
  } else if (raw && typeof raw === "object") {
    for (const [field, value] of Object.entries(raw as Record<string, unknown>)) {
      const messages = (Array.isArray(value) ? value : [value])
        .map(String)
        .map((message) => message.trim())
        .filter(Boolean);
      if (messages.length > 0) {
        fieldErrors[field] = messages;
        errors.push(...messages);
      }
    }
  }
  return { errors: [...new Set(errors)], fieldErrors };
}

export function getApiErrorInfo(
  error: unknown,
  fallback = "The operation could not be completed.",
  languageOrIsVietnamese?: string | boolean
): ApiErrorInfo {
  const candidate = (error ?? {}) as ApiErrorShape;
  const status = candidate.response?.status;
  const payload = candidate.response?.data;
  const lang = resolveLocale(languageOrIsVietnamese);
  const { errors, fieldErrors } = collectPayloadErrors(payload);
  const body = payload && typeof payload === "object"
    ? payload as { message?: unknown; title?: unknown; code?: unknown }
    : undefined;
  const serverMessage = typeof body?.message === "string" && body.message.trim()
    ? body.message.trim()
    : errors[0];
  const validationTitle = typeof body?.title === "string" && body.title.trim()
    ? body.title.trim()
    : undefined;
  const networkFailure = !status && Boolean(candidate.message);
  const message = candidate.code === "write_uncertain"
    ? getTranslation(lang, "error.write_uncertain", "Could not confirm whether this was saved. Check your records; retrying the same details uses the original request ID.")
    : serverMessage
    || validationTitle
    || (networkFailure
      ? getTranslation(lang, "error.network_reach", "Could not reach the server. Check your connection or service status and try again.")
      : statusMessage(status, lang, fallback));

  return {
    message,
    status,
    code: typeof body?.code === "string" ? body.code : undefined,
    errors: errors.length > 0 ? errors : [message],
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    retryable: !status || status === 408 || status === 429 || status >= 500,
  };
}

export function getApiErrorMessage(error: unknown, fallback: string, languageOrIsVietnamese?: string | boolean) {
  return getApiErrorInfo(error, fallback, languageOrIsVietnamese).message;
}

export function toApiFailure(error: unknown, fallback: string, languageOrIsVietnamese?: string | boolean) {
  const info = getApiErrorInfo(error, fallback, languageOrIsVietnamese);
  return {
    success: false as const,
    status: info.status,
    message: info.message,
    errors: info.errors,
    fieldErrors: info.fieldErrors,
  };
}
