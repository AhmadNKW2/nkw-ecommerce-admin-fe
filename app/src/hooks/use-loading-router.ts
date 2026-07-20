"use client";

import { useCallback, useMemo } from "react";
import { useRouter as useNextRouter } from "next/navigation";
import { useLoading } from "@/providers/loading-provider";

type NextRouter = ReturnType<typeof useNextRouter>;

const SOFT_NAV_FALLBACK_MS = 8000;

function toPathname(href: string): string {
  return href.split("?")[0].split("#")[0];
}

/**
 * useLoadingRouter
 * Wraps Next.js App Router navigation methods so any navigation triggered by
 * a button (router.push/replace) behaves the same as a <Link> click: it starts
 * the global loading UI immediately.
 *
 * If soft navigation stalls (common after mutations that invalidate many queries),
 * falls back to a hard navigation after a timeout — but only if the URL never left
 * the page where navigation was started.
 */
export function useLoadingRouter(): NextRouter {
  const router = useNextRouter();
  const { startLoading } = useLoading();

  const navigateWithFallback = useCallback(
    (
      method: "push" | "replace",
      href: string,
      options?: Parameters<NextRouter["push"]>[1]
    ) => {
      startLoading();
      const fromPath =
        typeof window !== "undefined" ? window.location.pathname : "";
      const targetPath = toPathname(href);

      const result =
        method === "push"
          ? router.push(href, options)
          : router.replace(href, options);

      if (
        typeof window !== "undefined" &&
        fromPath &&
        targetPath &&
        targetPath !== fromPath
      ) {
        window.setTimeout(() => {
          // Soft nav never left the origin page — force a full load.
          if (window.location.pathname === fromPath) {
            window.location.assign(href);
          }
        }, SOFT_NAV_FALLBACK_MS);
      }

      return result;
    },
    [router, startLoading]
  );

  const push = useCallback<NextRouter["push"]>(
    (href, options) => navigateWithFallback("push", href, options),
    [navigateWithFallback]
  );

  const replace = useCallback<NextRouter["replace"]>(
    (href, options) => navigateWithFallback("replace", href, options),
    [navigateWithFallback]
  );

  const back = useCallback<NextRouter["back"]>(() => {
    startLoading();
    return router.back();
  }, [router, startLoading]);

  const forward = useCallback<NextRouter["forward"]>(() => {
    startLoading();
    return router.forward();
  }, [router, startLoading]);

  const refresh = useCallback<NextRouter["refresh"]>(() => {
    startLoading();
    return router.refresh();
  }, [router, startLoading]);

  return useMemo(
    () => ({
      ...router,
      push,
      replace,
      back,
      forward,
      refresh,
    }),
    [router, push, replace, back, forward, refresh]
  );
}

// Drop-in replacement for `next/navigation`'s `useRouter`.
export const useRouter = useLoadingRouter;
