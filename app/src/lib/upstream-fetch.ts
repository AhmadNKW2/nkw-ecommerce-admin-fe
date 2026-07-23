/**
 * Resilient upstream fetch for the admin /api proxy.
 * Node's undici surfaces transient network blips as Error("fetch failed").
 */

const TRANSIENT_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_SOCKET",
]);

/** Permanent request/response shape bugs — retrying only multiplies Vercel 500s. */
const NON_TRANSIENT_NETWORK_CODES = new Set([
  "UND_ERR_INVALID_ARG",
  "UND_ERR_INVALID_RESPONSE",
]);

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 200;

function collectErrorChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  let current: unknown = error;
  const seen = new Set<unknown>();

  while (current && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    if (typeof current !== "object") break;
    current = (current as { cause?: unknown }).cause;
  }

  return chain;
}

export function isTransientUpstreamError(error: unknown): boolean {
  const chain = collectErrorChain(error);

  for (const item of chain) {
    if (typeof item === "string") {
      if (/UND_ERR_INVALID_ARG|invalid transfer-encoding/i.test(item)) {
        return false;
      }
      continue;
    }
    if (!(item instanceof Error)) continue;

    const code = (item as Error & { code?: string }).code;
    if (code && NON_TRANSIENT_NETWORK_CODES.has(code)) {
      return false;
    }
    if (/UND_ERR_INVALID_ARG|invalid transfer-encoding/i.test(item.message)) {
      return false;
    }
  }

  for (const item of chain) {
    if (!(item instanceof Error)) {
      if (
        typeof item === "string" &&
        /fetch failed|network|socket|timeout/i.test(item)
      ) {
        return true;
      }
      continue;
    }

    const code = (item as Error & { code?: string }).code;
    if (code && TRANSIENT_NETWORK_CODES.has(code)) {
      return true;
    }

    if (
      item.name === "TimeoutError" ||
      item.name === "AbortError" ||
      /fetch failed|network|socket|ECONNRESET|ETIMEDOUT|other side closed/i.test(
        item.message,
      )
    ) {
      return true;
    }
  }

  return false;
}

export function serializeUpstreamError(error: unknown): {
  message: string;
  code?: string;
  cause?: string;
  stack?: string;
} {
  if (!(error instanceof Error)) {
    return {
      message: typeof error === "string" ? error : "Unknown proxy error",
    };
  }

  const cause = (error as Error & { cause?: unknown }).cause;
  const causeMessage =
    cause instanceof Error
      ? cause.message
      : typeof cause === "string"
        ? cause
        : cause && typeof cause === "object" && "code" in cause
          ? String((cause as { code?: string }).code)
          : undefined;

  const code =
    (error as Error & { code?: string }).code ||
    (cause && typeof cause === "object" && "code" in cause
      ? String((cause as { code?: string }).code)
      : undefined);

  return {
    message: error.message,
    ...(code ? { code } : {}),
    ...(causeMessage ? { cause: causeMessage } : {}),
    ...(error.stack ? { stack: error.stack } : {}),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type UpstreamFetchOptions = RequestInit & {
  maxAttempts?: number;
  baseDelayMs?: number;
};

/**
 * fetch() with short retries for transient network failures only.
 * Does not retry HTTP 4xx/5xx — those are real upstream responses.
 */
export async function fetchUpstream(
  url: string,
  init: UpstreamFetchOptions = {},
): Promise<Response> {
  const {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    ...fetchInit
  } = init;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetch(url, fetchInit);
    } catch (error) {
      lastError = error;
      const shouldRetry =
        attempt < maxAttempts && isTransientUpstreamError(error);

      if (!shouldRetry) {
        throw error;
      }

      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      await sleep(delayMs);
    }
  }

  throw lastError;
}
