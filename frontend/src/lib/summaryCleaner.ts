export function cleanSummaryText(text: string | null | undefined): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Strip headers (# Header, ## Subheader)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

  // 2. Strip bold/italic (**text**, __text__, *text*, _text_)
  cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, "$2");
  cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, "$2");

  // 3. Strip inline code/backticks (`code`)
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // 4. Strip bullet lists (* item, - item, + item) and numbered lists (1. item, 2. item) at line start
  cleaned = cleaned.replace(/^\s*[*+]\s+/gm, "").replace(/^\s*-\s+/gm, "");
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, "");

  // 5. Collapse multiple blank lines down to single blank lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}
