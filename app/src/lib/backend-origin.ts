/**
 * Single backend origin for the admin app.
 *
 * Set BACKEND_ORIGIN once (e.g. https://api.ordonsooq.com or http://localhost:3001).
 * - Server: API proxy route, SSR fetches
 * - Client: direct file uploads (bypasses Vercel /api body limit)
 *
 * next.config.ts exposes BACKEND_ORIGIN to the browser bundle via `env`.
 */

const DEFAULT_BACKEND_ORIGIN = "http://localhost:3001";

export function getBackendOrigin(): string {
  return (process.env.BACKEND_ORIGIN || DEFAULT_BACKEND_ORIGIN).replace(
    /\/$/,
    "",
  );
}
