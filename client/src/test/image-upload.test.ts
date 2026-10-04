import { describe, expect, it } from "vitest";
import { prepareRecordImage } from "@/lib/imageUpload";

describe("record image upload", () => {
  it("keeps a small supported image as a data URL", async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], "receipt.png", { type: "image/png" });

    const result = await prepareRecordImage(file);

    expect(result).toBe("data:image/png;base64,iVBORw==");
  });

  it("rejects unsafe image formats before upload", async () => {
    const file = new File(["<svg></svg>"], "unsafe.svg", { type: "image/svg+xml" });

    await expect(prepareRecordImage(file)).rejects.toThrow("JPEG, PNG, or WebP");
  });
});
