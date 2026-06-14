import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type HeaderSnapshot = Record<string, string | string[]>;

export interface SsrApiRequestLog {
  id: number;
  generation: number;
  startedAt: string;
  method: string;
  frontendUrl: string;
  upstreamUrl: string;
  pathSegments: string[];
  headers: HeaderSnapshot;
  body: unknown;
}

export interface SsrApiResponseLog {
  finishedAt: string;
  durationMs: number;
  status: number;
  statusText: string;
  ok: boolean;
  headers: HeaderSnapshot;
  body: unknown;
}

interface SsrApiErrorLog {
  finishedAt: string;
  durationMs: number;
  message: string;
  stack?: string;
}

interface SsrApiLogStore {
  nextId: number;
  generation: number;
  writeQueue: Promise<void>;
}

declare global {
  var __SSR_API_LOG_STORE__: SsrApiLogStore | undefined;
}

const SSR_API_LOG_DIRECTORY = path.join(process.cwd(), "dev-logs");
const SSR_API_REQUESTS_LOG_FILE = path.join(
  SSR_API_LOG_DIRECTORY,
  "ssr-api-requests.log"
);
const SSR_API_REQUESTS_WITH_RESPONSES_LOG_FILE = path.join(
  SSR_API_LOG_DIRECTORY,
  "ssr-api-requests-with-responses.log"
);

function getStore(): SsrApiLogStore {
  if (!globalThis.__SSR_API_LOG_STORE__) {
    globalThis.__SSR_API_LOG_STORE__ = {
      nextId: 1,
      generation: 1,
      writeQueue: Promise.resolve(),
    };
  }

  return globalThis.__SSR_API_LOG_STORE__;
}

async function ensureLogDirectory() {
  await mkdir(SSR_API_LOG_DIRECTORY, { recursive: true });
}

function formatLogEntry(label: string, payload: unknown): string {
  return [
    `===== ${label} =====`,
    JSON.stringify(payload, null, 2),
    "",
  ].join("\n");
}

function enqueueWrite(task: () => Promise<void>) {
  const store = getStore();
  store.writeQueue = store.writeQueue.then(task, task);
  return store.writeQueue;
}

function enqueueGenerationAwareWrite(
  generation: number,
  task: () => Promise<void>
) {
  return enqueueWrite(async () => {
    if (getStore().generation !== generation) {
      return;
    }

    await task();
  });
}

async function appendLogEntry(filePath: string, label: string, payload: unknown) {
  await ensureLogDirectory();
  await appendFile(filePath, formatLogEntry(label, payload), "utf8");
}

export function isSsrApiDevLoggingEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function createSsrApiRequestLogContext() {
  const store = getStore();

  return {
    id: store.nextId++,
    generation: store.generation,
  };
}

export async function logSsrApiRequestStarted(request: SsrApiRequestLog) {
  if (!isSsrApiDevLoggingEnabled()) {
    return;
  }

  await enqueueGenerationAwareWrite(request.generation, async () => {
    await appendLogEntry(
      SSR_API_REQUESTS_LOG_FILE,
      `[SSR API][REQUEST][G${request.generation}#${request.id}] ${request.method} ${request.upstreamUrl}`,
      request
    );
  });
}

export async function logSsrApiRequestCompleted(payload: {
  request: SsrApiRequestLog;
  response: SsrApiResponseLog;
}) {
  if (!isSsrApiDevLoggingEnabled()) {
    return;
  }

  await enqueueGenerationAwareWrite(payload.request.generation, async () => {
    await appendLogEntry(
      SSR_API_REQUESTS_WITH_RESPONSES_LOG_FILE,
      `[SSR API][RESPONSE][G${payload.request.generation}#${payload.request.id}] ${payload.response.status} ${payload.request.method} ${payload.request.upstreamUrl}`,
      payload
    );
  });
}

export async function logSsrApiRequestFailed(payload: {
  request: SsrApiRequestLog;
  error: SsrApiErrorLog;
}) {
  if (!isSsrApiDevLoggingEnabled()) {
    return;
  }

  await enqueueGenerationAwareWrite(payload.request.generation, async () => {
    await appendLogEntry(
      SSR_API_REQUESTS_WITH_RESPONSES_LOG_FILE,
      `[SSR API][ERROR][G${payload.request.generation}#${payload.request.id}] ${payload.request.method} ${payload.request.upstreamUrl}`,
      payload
    );
  });
}

export async function resetSsrApiLogs(reason = "client-reset") {
  if (!isSsrApiDevLoggingEnabled()) {
    return;
  }

  const store = getStore();
  store.generation += 1;

  await enqueueWrite(async () => {
    await ensureLogDirectory();
    await writeFile(SSR_API_REQUESTS_LOG_FILE, "", "utf8");
    await writeFile(SSR_API_REQUESTS_WITH_RESPONSES_LOG_FILE, "", "utf8");
  });
}