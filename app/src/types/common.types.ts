/**
 * Common types used across the application
 */

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  time?: string;
}

// Backend returns data as array with meta directly
export interface PaginatedApiResponse<T, M extends PaginationMeta = PaginationMeta> {
  data: T[];
  meta: M;
  message?: string;
  success: boolean;
  time?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  /** Present on analytics visitors list (visitors | admins). */
  audience?: "visitors" | "admins";
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface FilterParams {
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

export type QueryParams = PaginationParams & SortParams & FilterParams;

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}
