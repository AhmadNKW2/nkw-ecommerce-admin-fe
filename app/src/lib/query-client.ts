/**
 * Global Query Client Instance
 * Allows access to QueryClient outside of React components
 * Used for invalidating queries after successful mutations in HTTP client
 */

import { QueryClient } from "@tanstack/react-query";
import { QUERY_CONFIG } from "./constants";
import { hydrateFeatureTogglesQueryClient } from "./feature-toggles-cache";
import { hydrateSiteBrandingQueryClient } from "./site-branding-cache";

// Global query client instance
let queryClient: QueryClient | null = null;

/**
 * Create and return the global QueryClient instance
 * Uses singleton pattern to ensure only one instance exists
 */
export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: QUERY_CONFIG.staleTime,
          gcTime: QUERY_CONFIG.cacheTime,
          refetchOnWindowFocus: QUERY_CONFIG.refetchOnWindowFocus,
          retry: QUERY_CONFIG.retry,
        },
        mutations: {
          retry: QUERY_CONFIG.retry,
        },
      },
    });
    hydrateFeatureTogglesQueryClient(queryClient);
    hydrateSiteBrandingQueryClient(queryClient);
  }
  return queryClient;
}

/**
 * Mark all queries stale without forcing an immediate refetch storm.
 * Called after successful POST, PUT, PATCH, DELETE in the HTTP client.
 *
 * Immediate `refetchType: 'active'` here previously kept the global loading
 * overlay up (and could stall soft navigation) because every mounted query
 * refetched at once — including heavy lists on create forms. Feature hooks
 * still do targeted invalidation with the default active refetch.
 */
export function invalidateAllQueries(): void {
  if (queryClient) {
    void queryClient.invalidateQueries({ refetchType: "none" });
  }
}

/**
 * Reset the query client (useful for logout)
 */
export function resetQueryClient(): void {
  if (queryClient) {
    queryClient.clear();
  }
}
