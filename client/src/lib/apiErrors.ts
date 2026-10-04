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

function prefersVietnamese(fallback: string, explicit?: boolean) {
  if (explicit !== undefined) return explicit;
  try {
    const saved = localStorage.getItem("tenvora_lang");
    if (saved === "vi" || saved === "en") return saved === "vi";
  } catch {
    // Local storage can be unavailable in privacy-restricted contexts.
  }
  return /[À-ỹ]/u.test(fallback);
}

function statusMessage(status: number | undefined, isVietnamese: boolean, fallback: string) {
  switch (status) {
    case 400:
    case 422:
      return isVietnamese
        ? "Một số thông tin chưa hợp lệ. Vui lòng kiểm tra lại các trường đã nhập."
        : "Some information is invalid. Check the fields and try again.";
    case 401:
      return isVietnamese
        ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        : "Your session has expired. Please sign in again.";
    case 403:
      return isVietnamese
        ? "Bạn không có quyền thực hiện thao tác này."
        : "You do not have permission to perform this action.";
    case 404:
      return isVietnamese
        ? "Không tìm thấy bản ghi này. Có thể bản ghi đã bị xoá hoặc thay đổi."
        : "This record could not be found. It may have been removed or changed.";
    case 409:
      return isVietnamese
        ? "Dữ liệu đã thay đổi hoặc bị trùng. Hãy làm mới trang và thử lại."
        : "The data changed or conflicts with an existing record. Refresh and try again.";
    case 413:
      return isVietnamese
        ? "Tệp hoặc yêu cầu quá lớn. Hãy chọn tệp nhỏ hơn rồi thử lại."
        : "The file or request is too large. Choose a smaller file and try again.";
    case 429:
      return isVietnamese
        ? "Bạn đang thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại."
        : "Too many requests were sent. Wait a moment and try again.";
    case 502:
    case 503:
    case 504:
      return isVietnamese
        ? "Dịch vụ đang tạm thời không khả dụng. Dữ liệu của bạn chưa bị thay đổi; hãy thử lại sau."
        : "The service is temporarily unavailable. Your data was not changed; try again shortly.";
    default:
      if (status && status >= 500) {
        return isVietnamese
          ? "Máy chủ không thể hoàn tất thao tác. Dữ liệu của bạn chưa bị thay đổi; hãy thử lại."
          : "The server could not complete the operation. Your data was not changed; try again.";
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

export function getApiErrorInfo(error: unknown, fallback = "The operation could not be completed.", isVietnamese?: boolean): ApiErrorInfo {
  const candidate = (error ?? {}) as ApiErrorShape;
  const status = candidate.response?.status;
  const payload = candidate.response?.data;
  const languageIsVietnamese = prefersVietnamese(fallback, isVietnamese);
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
  const message = serverMessage
    || validationTitle
    || (networkFailure
      ? (languageIsVietnamese
        ? "Không thể kết nối tới máy chủ. Kiểm tra mạng hoặc trạng thái dịch vụ rồi thử lại."
        : "Could not reach the server. Check your connection or service status and try again.")
      : statusMessage(status, languageIsVietnamese, fallback));

  return {
    message,
    status,
    code: typeof body?.code === "string" ? body.code : undefined,
    errors: errors.length > 0 ? errors : [message],
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    retryable: !status || status === 408 || status === 429 || status >= 500,
  };
}

export function getApiErrorMessage(error: unknown, fallback: string, isVietnamese?: boolean) {
  return getApiErrorInfo(error, fallback, isVietnamese).message;
}

export function toApiFailure(error: unknown, fallback: string, isVietnamese?: boolean) {
  const info = getApiErrorInfo(error, fallback, isVietnamese);
  return {
    success: false as const,
    message: info.message,
    errors: info.errors,
    fieldErrors: info.fieldErrors,
  };
}
