export function normalizeExternalUrl(value?: string | null): string | null {
  if (!value || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function openReferenceLink(value?: string | null) {
  const url = normalizeExternalUrl(value);

  if (!url) {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
