const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxSourceBytes = 12_000_000;
const maxStoredBytes = 1_900_000;
const maxDimension = 1600;

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected image could not be opened."));
    image.src = source;
  });
}

function dataUrlBytes(value: string) {
  const comma = value.indexOf(",");
  return comma < 0 ? value.length : Math.ceil((value.length - comma - 1) * 0.75);
}

export async function prepareRecordImage(file: File): Promise<string> {
  if (!acceptedImageTypes.has(file.type)) throw new Error("Choose a JPEG, PNG, or WebP image.");
  if (file.size > maxSourceBytes) throw new Error("Choose an image smaller than 12 MB.");

  const source = await readAsDataUrl(file);
  if (file.size <= maxStoredBytes) return source;

  const image = await loadImage(source);
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is unavailable in this browser.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.86, 0.76, 0.66, 0.56]) {
    const result = canvas.toDataURL("image/jpeg", quality);
    if (dataUrlBytes(result) <= maxStoredBytes) return result;
  }

  throw new Error("The image is still too large after processing. Choose a smaller image.");
}
