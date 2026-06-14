/**
 * Application-wide constants
 */

export const APP_CONFIG = {
  name: "Admin Dashboard",
  description: "Admin panel for storefront management",
} as const;

export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "/api",
  timeout: 30000,
} as const;

export const STOREFRONT_CONFIG = {
  baseUrl:
    process.env.NEXT_PUBLIC_STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000",
} as const;

export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false,
  retry: 1,
} as const;

export const PAGINATION = {
  defaultPage: 1,
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50, 100] as const,
} as const;
