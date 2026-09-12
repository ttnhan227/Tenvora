export function normalizeAssistantMarkdown(text: string) {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/^(\s*)•\s+/, "$1- ").replace(/^(\s*)(\d+)\)\s+/, "$1$2. "))
    .join("\n")
    .trim();

  if (normalized.includes("\n")) return normalized;
  return normalized.replace(/([.!?])\s+(?=[A-Z])/g, "$1\n\n");
}
