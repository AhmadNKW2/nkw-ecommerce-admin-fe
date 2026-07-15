import { NextResponse } from "next/server";
import { getBackendOrigin } from "../../src/lib/backend-origin";
import {
  createSsrApiRequestLogContext,
  isSsrApiDevLoggingEnabled,
  logSsrApiRequestCompleted,
  logSsrApiRequestFailed,
  logSsrApiRequestStarted,
} from "../../src/lib/dev/ssr-api-request-logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function headersToObject(
  headers: Headers,
  overrides: Record<string, string | string[]> = {}
): Record<string, string | string[]> {
  const snapshot: Record<string, string | string[]> = {};

  headers.forEach((value, key) => {
    snapshot[key] = value;
  });

  Object.entries(overrides).forEach(([key, value]) => {
    snapshot[key] = value;
  });

  return snapshot;
}

function isTextLikeContentType(contentType: string | null): boolean {
  if (!contentType) {
    return true;
  }

  return (
    contentType.includes("application/json") ||
    contentType.includes("application/problem+json") ||
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("application/xml") ||
    contentType.includes("application/javascript") ||
    contentType.startsWith("text/")
  );
}

function decodeBody(buffer: Uint8Array, contentType: string | null) {
  if (buffer.byteLength === 0) {
    return null;
  }

  if (!isTextLikeContentType(contentType)) {
    return {
      kind: "binary",
      contentType: contentType ?? "unknown",
      size: buffer.byteLength,
    };
  }

  const text = new TextDecoder().decode(buffer);

  if (!text) {
    return null;
  }

  if (contentType?.includes("application/json") || contentType?.includes("application/problem+json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  if (contentType?.includes("application/x-www-form-urlencoded")) {
    const parsed: Record<string, string | string[]> = {};
    const params = new URLSearchParams(text);

    params.forEach((value, key) => {
      const current = parsed[key];

      if (current === undefined) {
        parsed[key] = value;
        return;
      }

      if (Array.isArray(current)) {
        current.push(value);
        return;
      }

      parsed[key] = [current, value];
    });

    return parsed;
  }

  return text;
}

async function readResponseBodyForLog(resp: Response) {
  const body = new Uint8Array(await resp.arrayBuffer());
  return decodeBody(body, resp.headers.get("content-type"));
}

function splitCombinedSetCookieHeader(headerValue: string): string[] {
  const cookies: string[] = [];
  let current = "";
  let inQuotes = false;
  let inExpires = false;

  for (let index = 0; index < headerValue.length; index += 1) {
    const char = headerValue[index];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if (!inQuotes) {
      const expiresToken = headerValue.slice(index, index + 8).toLowerCase();
      if (!inExpires && expiresToken === "expires=") {
        inExpires = true;
      }

      if (char === ";" && inExpires) {
        inExpires = false;
      }

      if (char === "," && !inExpires) {
        const trimmed = current.trim();
        if (trimmed) {
          cookies.push(trimmed);
        }
        current = "";
        continue;
      }
    }

    current += char;
  }

  const trailing = current.trim();
  if (trailing) {
    cookies.push(trailing);
  }

  return cookies;
}

function getSetCookieHeaders(resp: Response): string[] {
  const getSetCookie = (resp.headers as any).getSetCookie as undefined | (() => string[]);
  if (typeof getSetCookie === "function") {
    return getSetCookie.call(resp.headers);
  }

  const single = resp.headers.get("set-cookie");
  return single ? splitCombinedSetCookieHeader(single) : [];
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: typeof error === "string" ? error : "Unknown proxy error",
  };
}

function buildUpstreamUrl(req: Request, pathSegments: string[]): string {
  const backendOrigin = getBackendOrigin();
  const url = new URL(req.url);

  // Our frontend calls /api/<path>. The backend expects /api/<path> too.
  const upstream = new URL(`${backendOrigin}/api/${pathSegments.join("/")}`);
  upstream.search = url.search;
  return upstream.toString();
}

async function proxy(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const upstreamUrl = buildUpstreamUrl(req, path);

  // Forward most headers (especially Cookie), but avoid sending hop-by-hop headers.
  const outgoingHeaders = new Headers(req.headers);
  outgoingHeaders.delete("host");

  const method = req.method.toUpperCase();
  const hasBody = !(method === "GET" || method === "HEAD");
  const startedAt = Date.now();
  const shouldLog = isSsrApiDevLoggingEnabled();
  const requestBody = hasBody ? new Uint8Array(await req.arrayBuffer()) : null;

  const requestLog = shouldLog
    ? {
        ...createSsrApiRequestLogContext(),
        startedAt: new Date(startedAt).toISOString(),
        method,
        frontendUrl: req.url,
        upstreamUrl,
        pathSegments: path,
        headers: headersToObject(outgoingHeaders),
        body: decodeBody(requestBody ?? new Uint8Array(), req.headers.get("content-type")),
      }
    : null;

  if (requestLog) {
    await logSsrApiRequestStarted(requestLog);
  }

  try {
    const upstreamResp = await fetch(upstreamUrl, {
      method,
      headers: outgoingHeaders,
      body: requestBody ?? undefined,
      redirect: "manual",
      cache: "no-store",
    });

    const resHeaders = new Headers();

    // Copy headers except ones Next/Vercel manage.
    upstreamResp.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === "content-encoding" || lower === "transfer-encoding" || lower === "connection" || lower === "content-length") return;
      if (lower === "set-cookie") return; // handled separately
      if (lower === "cache-control") return;
      resHeaders.set(key, value);
    });

    // Never cache authenticated admin API responses at the CDN/browser.
    resHeaders.set("Cache-Control", "private, no-store, must-revalidate");
    resHeaders.set("Vary", "Cookie");

    // Preserve Set-Cookie properly (can be multiple).
    const setCookies = getSetCookieHeaders(upstreamResp);
    if (setCookies.length > 0) {
      for (const cookie of setCookies) {
        resHeaders.append("set-cookie", cookie);
      }
    } else {
      const single = upstreamResp.headers.get("set-cookie");
      if (single) {
        resHeaders.set("set-cookie", single);
      }
    }

    const isSse = upstreamResp.headers.get("content-type")?.includes("text/event-stream");

    if (isSse) {
      resHeaders.set("Cache-Control", "no-cache, no-transform");
      resHeaders.set("Connection", "keep-alive");
      // Prevent reverse proxies (e.g. nginx) from buffering the SSE body.
      resHeaders.set("X-Accel-Buffering", "no");
    }

    if (requestLog) {

      const responseBody = isSse ? "[SSE Stream]" : await readResponseBodyForLog(upstreamResp.clone());
      await logSsrApiRequestCompleted({
        request: requestLog,
        response: {
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt,
          status: upstreamResp.status,
          statusText: upstreamResp.statusText,
          ok: upstreamResp.ok,
          headers: headersToObject(upstreamResp.headers, setCookies.length > 0 ? { "set-cookie": setCookies } : {}),
          body: responseBody,
        },
      });
    }

    return new NextResponse(upstreamResp.body, {
      status: upstreamResp.status,
      headers: resHeaders,
    });
  } catch (error) {
    if (requestLog) {
      await logSsrApiRequestFailed({
        request: requestLog,
        error: {
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt,
          ...serializeError(error),
        },
      });
    }

    throw error;
  }
}

export function GET(req: Request, ctx: any) {
  return proxy(req, ctx);
}
export function POST(req: Request, ctx: any) {
  return proxy(req, ctx);
}
export function PUT(req: Request, ctx: any) {
  return proxy(req, ctx);
}
export function PATCH(req: Request, ctx: any) {
  return proxy(req, ctx);
}
export function DELETE(req: Request, ctx: any) {
  return proxy(req, ctx);
}
export function OPTIONS(req: Request, ctx: any) {
  return proxy(req, ctx);
}
