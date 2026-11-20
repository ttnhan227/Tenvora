import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "@/services/apiClient";
import { businessService } from "@/services/businessService";
import { ensureUploadedImageUrl, prepareRecordImage, resolveRecordMediaUrl } from "@/lib/imageUpload";

describe("record image upload", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps a small supported image as a data URL", async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], "receipt.png", { type: "image/png" });

    const result = await prepareRecordImage(file);

    expect(result).toBe("data:image/png;base64,iVBORw==");
  });

  it("rejects unsafe image formats before upload", async () => {
    const file = new File(["<svg></svg>"], "unsafe.svg", { type: "image/svg+xml" });

    await expect(prepareRecordImage(file)).rejects.toThrow("JPEG, PNG, or WebP");
  });

  it("uploads data URLs via /media/upload-dataurl before record mutation", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockImplementation(async (url) => {
      if (url === "/media/upload-dataurl") {
        return { data: { success: true, data: { url: "/uploads/tenvora/t1/products/abc.png" } } } as any;
      }
      return { data: { success: true, data: { id: "prod-1", name: "Coffee", imageDataUrl: "/uploads/tenvora/t1/products/abc.png" } } } as any;
    });

    const created = await businessService.createProduct({
      name: "Coffee",
      unit: "bag",
      defaultPrice: 120,
      imageDataUrl: "data:image/png;base64,iVBORw==",
    });

    expect(postSpy).toHaveBeenNthCalledWith(1, "/media/upload-dataurl", {
      dataUrl: "data:image/png;base64,iVBORw==",
      folder: "products",
    });
    expect(postSpy).toHaveBeenNthCalledWith(2, "/products", expect.objectContaining({
      imageDataUrl: "/uploads/tenvora/t1/products/abc.png",
    }));
    expect(created.imageDataUrl).toBe("/uploads/tenvora/t1/products/abc.png");
  });

  it("passes hosted URLs through unchanged and resolves relative upload paths", async () => {
    const postSpy = vi.spyOn(apiClient, "post");
    const hosted = await ensureUploadedImageUrl("https://cdn.example.com/receipt.jpg", "expenses");
    expect(hosted).toBe("https://cdn.example.com/receipt.jpg");
    expect(postSpy).not.toHaveBeenCalled();

    const prevBaseUrl = apiClient.defaults.baseURL;
    try {
      apiClient.defaults.baseURL = "https://api.tenvora.example/api";
      expect(resolveRecordMediaUrl("/uploads/tenvora/t1/expenses/r.jpg")).toBe(
        "https://api.tenvora.example/uploads/tenvora/t1/expenses/r.jpg"
      );
      expect(resolveRecordMediaUrl("https://cdn.example.com/receipt.jpg")).toBe(
        "https://cdn.example.com/receipt.jpg"
      );
      expect(resolveRecordMediaUrl("http://cdn.example.com/receipt.jpg")).toBe(
        "http://cdn.example.com/receipt.jpg"
      );
      expect(
        resolveRecordMediaUrl("https://proj.supabase.co/storage/v1/object/public/receipts/tenvora/t1/r.webp")
      ).toBe(
        "https://proj.supabase.co/storage/v1/object/public/receipts/tenvora/t1/r.webp"
      );
      expect(resolveRecordMediaUrl(undefined)).toBeUndefined();
      expect(resolveRecordMediaUrl(null)).toBeUndefined();
      expect(resolveRecordMediaUrl("")).toBeUndefined();
      expect(resolveRecordMediaUrl("   ")).toBeUndefined();

      apiClient.defaults.baseURL = "not-a-valid-url";
      expect(resolveRecordMediaUrl("/uploads/tenvora/t1/expenses/r.jpg")).toBe(
        "/uploads/tenvora/t1/expenses/r.jpg"
      );
    } finally {
      apiClient.defaults.baseURL = prevBaseUrl;
    }
  });
});
