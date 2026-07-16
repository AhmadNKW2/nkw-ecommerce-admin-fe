/** Auth routes that must not use the protected admin shell. */
export function isAuthRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized === "/login";
}
