import { describe, expect, it } from "vitest";
import { getApiErrorInfo, toApiFailure } from "@/lib/apiErrors";

describe("API error messages", () => {
  it("preserves a specific server operation message", () => {
    const info = getApiErrorInfo({
      response: {
        status: 409,
        data: { message: "This payment has already been reversed.", code: "state_conflict" },
      },
    }, "Could not reverse payment", false);

    expect(info.message).toBe("This payment has already been reversed.");
    expect(info.code).toBe("state_conflict");
    expect(info.retryable).toBe(false);
  });

  it("extracts field validation messages from problem details", () => {
    const failure = toApiFailure({
      response: {
        status: 400,
        data: {
          title: "Validation failed",
          errors: { Name: ["Name is required."], Unit: ["Unit is required."] },
        },
      },
    }, "Could not save", false);

    expect(failure.message).toBe("Name is required.");
    expect(failure.errors).toEqual(["Name is required.", "Unit is required."]);
    expect(failure.fieldErrors?.Name).toEqual(["Name is required."]);
  });

  it("turns an HTML proxy 413 response into a useful upload message", () => {
    const info = getApiErrorInfo({ response: { status: 413, data: "<html>Request Entity Too Large</html>" } }, "Could not save", false);

    expect(info.message).toContain("too large");
    expect(info.message).toContain("smaller file");
  });

  it("localizes permission failures", () => {
    const info = getApiErrorInfo({ response: { status: 403 } }, "Không thể lưu", true);

    expect(info.message).toContain("không có quyền");
  });

  it("distinguishes connection failures from server validation", () => {
    const info = getApiErrorInfo(new Error("Network Error"), "Could not load", false);

    expect(info.message).toContain("Could not reach the server");
    expect(info.retryable).toBe(true);
  });
});
