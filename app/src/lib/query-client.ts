/**
 * Global Query Client Instance
 * Allows access to QueryClient outside of React components
 * Used for invalidating queries after successful mutations in HTTP client
 */

import { QueryClient } from "@tanstack/react-query";
import { QUERY_CONFIG } from "./constants";
import { hydrateFeatureTogglesQueryClient } from "./feature-toggles-cache";

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
  }
  return queryClient;
}

/**
 * Invalidate all queries in the cache
 * Called after successful POST, PUT, PATCH, DELETE requests
 */
export function invalidateAllQueries(): void {
  if (queryClient) {
    // Invalidate all queries to force refetch
    queryClient.invalidateQueries();
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
