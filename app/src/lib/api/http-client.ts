/**
 * HTTP Client - A wrapper around fetch API with interceptors and error handling
 * Following the Singleton pattern
 * Supports cookie-based authentication with automatic token refresh
 */

import { API_CONFIG } from "../constants";
import { ApiError, ApiResponse } from "../../types/common.types";
import type { RefreshTokenResponse } from "../../services/auth/types/auth.types";
import {
  dismissToast,
  finishToastError,
  showErrorToast,
  showLoadingToast,
  updateLoadingToast,
} from "../toast";
import { sessionManager } from "../session/session-manager";
import { invalidateAllQueries } from "../query-client";

type RequestInterceptor = (
  config: RequestInit
) => RequestInit | Promise<RequestInit>;
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

// Event type for auth state changes
export type AuthStateChangeHandler = (isAuthenticated: boolean) => void;

class HttpClient {
  private static instance: HttpClient;
  private baseURL: string;
  private defaultHeaders: HeadersInit;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<ApiResponse<RefreshTokenResponse> | null> | null =
    null;
  private authStateHandlers: Set<AuthStateChangeHandler> = new Set();
  private isRedirecting: boolean = false;

  private static readonly AUTH_REFRESH_ENDPOINT = "/auth/refresh";

  private static readonly REQUEST_TOAST_HEADER = "x-request-toast";
  private static readonly SKIP_REQUEST_TOAST_HEADER = "x-skip-request-toast";

  private emitApiLoading(delta: 1 | -1) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("os:api-loading", {
        detail: { delta },
      })
    );
  }

  private shouldShowRequestToast(endpoint: string, options?: RequestInit): boolean {
    // Avoid double-toasting for flows that already show richer multi-step progress
    // (e.g. products create/edit aggregates uploads + final request).
    if (endpoint.includes("/media/upload")) return false;
    // Refresh requests should stay silent.
    if (endpoint === HttpClient.AUTH_REFRESH_ENDPOINT) return false;
    if (this.isSkipRequestToast(options)) return false;
    return true;
  }

  private getRequestToastTitle(method: string): string {
    switch (method.toUpperCase()) {
      case "POST":
        return "Saving";
      case "PUT":
      case "PATCH":
        return "Updating";
      case "DELETE":
        return "Deleting";
      default:
        return "Processing";
    }
  }

  private startRequestProgressToast(method: string, endpoint: string) {
    if (typeof window === "undefined") {
      return null;
    }

    const title = this.getRequestToastTitle(method);
    const toastId = showLoadingToast("");

    let progress = 0;
    updateLoadingToast(toastId, {
      title,
      subtitle: endpoint,
      progress,
    });

    const intervalId = window.setInterval(() => {
      // Simulated progress: climb quickly at first, then slow down and cap at 90%
      const increment = progress < 0.5 ? 0.06 : progress < 0.8 ? 0.03 : 0.015;
      progress = Math.min(0.9, progress + increment);
      updateLoadingToast(toastId, { title, subtitle: endpoint, progress });
    }, 250);

    const stop = () => {
      window.clearInterval(intervalId);
    };

    const succeed = () => {
      stop();
      updateLoadingToast(toastId, { title, subtitle: endpoint, progress: 1 });
      // Allow a single paint at 100%, then dismiss quickly to feel snappy.
      window.setTimeout(() => dismissToast(toastId), 180);
    };

    const fail = (message: string) => {
      stop();
      finishToastError(toastId, message);
    };

    return { toastId, succeed, fail };
  }

  private hasRequestToastHeader(options?: RequestInit): boolean {
    if (!options?.headers) return false;
    try {
      const headers = new Headers(options.headers);
      return headers.get(HttpClient.REQUEST_TOAST_HEADER) === "1";
    } catch {
      return false;
    }
  }

  private isSkipRequestToast(options?: RequestInit): boolean {
    if (!options?.headers) return false;
    try {
      const headers = new Headers(options.headers);
      return headers.get(HttpClient.SKIP_REQUEST_TOAST_HEADER) === "1";
    } catch {
      return false;
    }
  }

  private stripInternalHeaders(options: RequestInit): RequestInit {
    if (!options.headers) return options;
    try {
      const headers = new Headers(options.headers);
      headers.delete(HttpClient.REQUEST_TOAST_HEADER);
      headers.delete(HttpClient.SKIP_REQUEST_TOAST_HEADER);
      return { ...options, headers };
    } catch {
      return options;
    }
  }

  private shouldInvalidateAllQueries(endpoint: string): boolean {
    // Blanket invalidation is expensive and can cause unrelated list queries
    // (categories/vendors/brands/attributes) to refetch after file uploads.
    // Media uploads are handled separately and shouldn't force global refetch.
    if (endpoint.includes("/media/upload")) return false;
    
    // Products have their own specific cache invalidation in ProductService
    if (endpoint.includes("/products")) return false;
    
    return true;
  }

  private resolveBaseUrl(configuredBaseUrl: string): string {
    const normalizedBaseUrl = configuredBaseUrl.replace(/\/$/, "") || "/api";

    if (typeof window === "undefined") {
      return normalizedBaseUrl;
    }

    try {
      const resolvedUrl = new URL(normalizedBaseUrl, window.location.origin);

      if (resolvedUrl.origin !== window.location.origin) {
        return "/api";
      }

      return resolvedUrl.pathname.replace(/\/$/, "") || "/api";
    } catch {
      return normalizedBaseUrl;
    }
  }

  private constructor() {
    this.baseURL = this.resolveBaseUrl(API_CONFIG.baseUrl);
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  public static getInstance(): HttpClient {
    if (!HttpClient.instance) {
      HttpClient.instance = new HttpClient();
    }
    return HttpClient.instance;
  }

  /**
   * Add a request interceptor
   */
  public addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add a response interceptor
   */
  public addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Subscribe to auth state changes (for 401 handling)
   */
  public onAuthStateChange(handler: AuthStateChangeHandler): () => void {
    this.authStateHandlers.add(handler);
    return () => {
      this.authStateHandlers.delete(handler);
    };
  }

  /**
   * Notify all handlers of auth state change
   */
  private notifyAuthStateChange(isAuthenticated: boolean): void {
    this.authStateHandlers.forEach(handler => handler(isAuthenticated));
  }

  private applyRefreshSideEffects(
    json: Partial<ApiResponse<RefreshTokenResponse>> & {
      access_token?: string;
      expires_in?: number;
    },
  ): ApiResponse<RefreshTokenResponse> | null {
    const success = typeof json?.success === "boolean" ? json.success : true;
    if (!success) {
      return null;
    }

    const tokenFromBody =
      json.data?.access_token ?? json.access_token;
    if (typeof tokenFromBody === "string" && tokenFromBody.length > 0) {
      this.setAuthToken(tokenFromBody);
    }

    const expiresIn = json.data?.expires_in ?? json.expires_in;
    if (typeof expiresIn === "number") {
      const sessionInfo = sessionManager.getSessionInfo();
      sessionManager.setSessionInfo({
        ...(sessionInfo ?? { rememberMe: false }),
        expiresAt: Date.now() + expiresIn * 1000,
        lastActivity: Date.now(),
      });
      sessionManager.broadcastEvent({
        type: "session_refresh",
        timestamp: Date.now(),
      });
    }

    return json as ApiResponse<RefreshTokenResponse>;
  }

  /**
   * Single-flight refresh used by auth context, job tracker, and 401 retries.
   * Concurrent refresh calls with the same cookie revoke all sessions on the backend.
   */
  public refreshSessionTokens(): Promise<ApiResponse<RefreshTokenResponse>> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.executeRefreshRequest().finally(() => {
        this.refreshPromise = null;
        this.isRefreshing = false;
      });
    }

    return this.refreshPromise.then((result) => {
      if (result?.success) {
        return result;
      }

      throw {
        message: "Session expired. Please login again.",
        statusCode: 401,
      } as ApiError;
    });
  }

  private async executeRefreshRequest(): Promise<ApiResponse<RefreshTokenResponse> | null> {
    this.isRefreshing = true;

    try {
      const headers = { ...this.defaultHeaders } as Record<string, string>;
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(
        `${this.baseURL}${HttpClient.AUTH_REFRESH_ENDPOINT}`,
        {
          method: "POST",
          credentials: "include",
          headers,
        },
      );

      if (!response.ok) {
        return null;
      }

      try {
        const json = (await response.clone().json()) as Partial<
          ApiResponse<RefreshTokenResponse>
        > & {
          access_token?: string;
          expires_in?: number;
        };
        return this.applyRefreshSideEffects(json);
      } catch {
        return {
          success: true,
          data: {
            access_token: "",
            expires_in: 3600,
          },
        } as ApiResponse<RefreshTokenResponse>;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      return null;
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      await this.refreshSessionTokens();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Apply all request interceptors
   */
  private async applyRequestInterceptors(
    config: RequestInit
  ): Promise<RequestInit> {
    let modifiedConfig = config;
    for (const interceptor of this.requestInterceptors) {
      modifiedConfig = await interceptor(modifiedConfig);
    }
    return modifiedConfig;
  }

  /**
   * Apply all response interceptors
   */
  private async applyResponseInterceptors(
    response: Response
  ): Promise<Response> {
    let modifiedResponse = response;
    for (const interceptor of this.responseInterceptors) {
      modifiedResponse = await interceptor(modifiedResponse);
    }
    return modifiedResponse;
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response, originalRequest?: { endpoint: string; options: RequestInit }): Promise<never> {
    let errorMessage = "An error occurred";
    let errors: Record<string, string[]> | undefined;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error?.message || errorMessage;
      errors = errorData.errors;
    } catch {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }

    const error: ApiError = {
      message: errorMessage,
      statusCode: response.status,
      errors,
    };

    // Handle 401 Unauthorized - attempt token refresh
    if (
      response.status === 401 &&
      originalRequest &&
      originalRequest.endpoint !== HttpClient.AUTH_REFRESH_ENDPOINT
    ) {
      // Try to refresh the token
      const refreshSuccess = await this.refreshToken();
      
      if (refreshSuccess) {
        const isFormDataBody =
          typeof FormData !== 'undefined' &&
          (originalRequest.options as any)?.body instanceof FormData;

        // Build retry headers using the latest auth header after refresh.
        const retryHeaders = new Headers((originalRequest.options.headers as HeadersInit) ?? undefined);
        const currentAuthHeader = (this.defaultHeaders as any).Authorization as string | undefined;
        if (currentAuthHeader && !retryHeaders.has('Authorization')) {
          retryHeaders.set('Authorization', currentAuthHeader);
        }

        if (!isFormDataBody) {
          // For JSON requests, also ensure default headers are present (without overwriting explicit headers).
          Object.entries(this.defaultHeaders as Record<string, string>).forEach(([key, value]) => {
            if (!retryHeaders.has(key)) {
              retryHeaders.set(key, value);
            }
          });
        }

        // Retry the original request
        const retryResponse = await fetch(
          `${this.baseURL}${originalRequest.endpoint}`,
          {
            ...originalRequest.options,
            headers: retryHeaders,
            credentials: 'include',
          }
        );
        
        if (retryResponse.ok) {
          // Return the successful response (caller will handle this)
          // We need to throw a special error that includes the retry response
          throw { __retryResponse: retryResponse };
        }
      }
      
      // Refresh failed or retry failed - clear session and redirect
      if (typeof window !== "undefined" && !this.isRedirecting) {
        const currentPath = window.location.pathname;
        // Don't redirect if already on login page
        if (currentPath === '/login') {
          // Just clear session and notify, don't redirect
          sessionManager.clearSession();
          this.removeAuthToken();
          this.notifyAuthStateChange(false);
          throw error;
        }
        
        this.isRedirecting = true;
        sessionManager.clearSession();
        this.removeAuthToken();
        // Save intended URL for after login
        const fullPath = currentPath + window.location.search;
        // Don't save login page or root as intended URL
        if (fullPath !== '/login' && fullPath !== '/') {
          sessionManager.setIntendedUrl(fullPath);
        }
        // Notify listeners of auth state change
        this.notifyAuthStateChange(false);
        // Redirect to login
        window.location.href = "/login";
      }
    }

    // Show error toast notification (except for auth errors which redirect)
    // If a request-level progress toast is active, it will be updated to error instead.
    const suppressErrorToast = this.hasRequestToastHeader(originalRequest?.options);
    if (response.status === 403) {
      showErrorToast("You don't have permission to perform this action");
    } else if (response.status !== 401 && !suppressErrorToast) {
      showErrorToast(errorMessage);
    }

    throw error;
  }

  /**
   * Make an HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();
    if (
      endpoint === HttpClient.AUTH_REFRESH_ENDPOINT &&
      method === "POST"
    ) {
      return this.refreshSessionTokens() as Promise<T>;
    }

    const url = `${this.baseURL}${endpoint}`;

    let config: RequestInit = {
      ...options,
      credentials: 'include', // Always include cookies for auth
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    // Apply request interceptors
    config = await this.applyRequestInterceptors(config);

    // Global API loading overlay
    this.emitApiLoading(1);
    try {
      try {
        const fetchConfig = this.stripInternalHeaders(config);
        let response = await fetch(url, fetchConfig);

        // Apply response interceptors
        response = await this.applyResponseInterceptors(response);

        if (!response.ok) {
          await this.handleError(response, { endpoint, options: config });
        }

        const data = await response.json();
        return data;
      } catch (error) {
        // Check if this is a retry response (successful after token refresh)
        if ((error as any)?.__retryResponse) {
          const retryResponse = (error as any).__retryResponse as Response;
          const data = await retryResponse.json();
          return data;
        }

        if ((error as ApiError).statusCode) {
          throw error;
        }

        // Network error or other fetch error
        const networkError = "Network error. Please check your connection.";
        if (!this.hasRequestToastHeader(config)) {
          showErrorToast(networkError);
        }
        throw {
          message: networkError,
          statusCode: 0,
        } as ApiError;
      }
    } finally {
      this.emitApiLoading(-1);
    }
  }

  /**
   * GET request
   */
  public get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let queryString = "";
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach((v) => searchParams.append(key, String(v)));
          } else {
            let strValue = String(value);
            // Protect against 414 URI Too Long by capping overly long search inputs generically
            if (key === 'search' && strValue.length > 150) {
              strValue = strValue.slice(0, 150);
            }
            searchParams.append(key, strValue);
          }
        }
      });
      const str = searchParams.toString();
      if (str) queryString = "?" + str;
    }

    return this.request<T>(`${endpoint}${queryString}`, {
      method: "GET",
    });
  }

  /**
   * POST request
   * Invalidates all queries on success to ensure fresh data
   */
  public async post<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    const requestToast = this.shouldShowRequestToast(endpoint, options)
      ? this.startRequestProgressToast("POST", endpoint)
      : null;

    try {
      const result = await this.request<T>(endpoint, {
        ...options,
        method: "POST",
        headers: {
          ...(options.headers as any),
          [HttpClient.REQUEST_TOAST_HEADER]: requestToast ? "1" : "0",
        },
        body: JSON.stringify(data),
      });
      // Invalidate all queries after successful mutation
      if (this.shouldInvalidateAllQueries(endpoint)) {
        invalidateAllQueries();
      }
      requestToast?.succeed();
      return result;
    } catch (error: any) {
      requestToast?.fail(error?.message || "Request failed");
      throw error;
    }
  }

  /**
   * PUT request
   * Invalidates all queries on success to ensure fresh data
   */
  public async put<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    const requestToast = this.shouldShowRequestToast(endpoint, options)
      ? this.startRequestProgressToast("PUT", endpoint)
      : null;

    try {
      const result = await this.request<T>(endpoint, {
        ...options,
        method: "PUT",
        headers: {
          ...(options.headers as any),
          [HttpClient.REQUEST_TOAST_HEADER]: requestToast ? "1" : "0",
        },
        body: JSON.stringify(data),
      });
      if (this.shouldInvalidateAllQueries(endpoint)) {
        invalidateAllQueries();
      }
      requestToast?.succeed();
      return result;
    } catch (error: any) {
      requestToast?.fail(error?.message || "Request failed");
      throw error;
    }
  }

  /**
   * PATCH request
   * Invalidates all queries on success to ensure fresh data
   */
  public async patch<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    const requestToast = this.shouldShowRequestToast(endpoint, options)
      ? this.startRequestProgressToast("PATCH", endpoint)
      : null;

    try {
      const result = await this.request<T>(endpoint, {
        ...options,
        method: "PATCH",
        headers: {
          ...(options.headers as any),
          [HttpClient.REQUEST_TOAST_HEADER]: requestToast ? "1" : "0",
        },
        body: JSON.stringify(data),
      });
      if (this.shouldInvalidateAllQueries(endpoint)) {
        invalidateAllQueries();
      }
      requestToast?.succeed();
      return result;
    } catch (error: any) {
      requestToast?.fail(error?.message || "Request failed");
      throw error;
    }
  }

  /**
   * DELETE request
   * Invalidates all queries on success to ensure fresh data
   */
  public async delete<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    const requestToast = this.shouldShowRequestToast(endpoint, options)
      ? this.startRequestProgressToast("DELETE", endpoint)
      : null;

    try {
      const result = await this.request<T>(endpoint, {
        ...options,
        method: "DELETE",
        headers: {
          ...(options.headers as any),
          [HttpClient.REQUEST_TOAST_HEADER]: requestToast ? "1" : "0",
        },
        ...(data && { body: JSON.stringify(data) }),
      });
      if (this.shouldInvalidateAllQueries(endpoint)) {
        invalidateAllQueries();
      }
      requestToast?.succeed();
      return result;
    } catch (error: any) {
      requestToast?.fail(error?.message || "Request failed");
      throw error;
    }
  }

  /**
   * POST request with FormData (for file uploads)
   * Invalidates all queries on success to ensure fresh data
   */
  public postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const requestToast = this.shouldShowRequestToast(endpoint)
      ? this.startRequestProgressToast("POST", endpoint)
      : null;

    // Don't set Content-Type for FormData - browser will set it with boundary
    const headers: HeadersInit = {};
    const authHeader = (this.defaultHeaders as any).Authorization;
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    if (requestToast) {
      (headers as any)[HttpClient.REQUEST_TOAST_HEADER] = "1";
    }

    return (async () => {
      this.emitApiLoading(1);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: this.stripInternalHeaders({ headers }).headers as Headers,
          body: formData,
          credentials: 'include', // Include cookies for auth
        });

        if (!response.ok) {
          await this.handleError(response, {
            endpoint,
            options: { method: 'POST', headers, body: formData, credentials: 'include' },
          });
        }

        const result = (await response.json()) as T;
        if (this.shouldInvalidateAllQueries(endpoint)) {
          invalidateAllQueries();
        }
        requestToast?.succeed();
        return result;
      } catch (error) {
        // If a 401 refresh+retry succeeded, handleError throws { __retryResponse }.
        // Treat it as a success here to avoid upstream retrying the mutation and
        // accidentally creating duplicates.
        if ((error as any)?.__retryResponse) {
          const retryResponse = (error as any).__retryResponse as Response;
          const result = (await retryResponse.json()) as T;
          if (this.shouldInvalidateAllQueries(endpoint)) {
            invalidateAllQueries();
          }
          requestToast?.succeed();
          return result;
        }

        requestToast?.fail((error as any)?.message || "Request failed");
        throw error;
      } finally {
        this.emitApiLoading(-1);
      }
    })();
  }

  /**
   * PATCH request with FormData (for file uploads)
   * Invalidates all queries on success to ensure fresh data
   */
  public patchFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const requestToast = this.shouldShowRequestToast(endpoint)
      ? this.startRequestProgressToast("PATCH", endpoint)
      : null;

    // Don't set Content-Type for FormData - browser will set it with boundary
    const headers: HeadersInit = {};
    const authHeader = (this.defaultHeaders as any).Authorization;
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    if (requestToast) {
      (headers as any)[HttpClient.REQUEST_TOAST_HEADER] = "1";
    }

    return (async () => {
      this.emitApiLoading(1);
      try {
        const response = await fetch(url, {
          method: "PATCH",
          headers: this.stripInternalHeaders({ headers }).headers as Headers,
          body: formData,
          credentials: 'include', // Include cookies for auth
        });

        if (!response.ok) {
          await this.handleError(response, {
            endpoint,
            options: { method: 'PATCH', headers, body: formData, credentials: 'include' },
          });
        }

        const result = (await response.json()) as T;
        if (this.shouldInvalidateAllQueries(endpoint)) {
          invalidateAllQueries();
        }
        requestToast?.succeed();
        return result;
      } catch (error) {
        if ((error as any)?.__retryResponse) {
          const retryResponse = (error as any).__retryResponse as Response;
          const result = (await retryResponse.json()) as T;
          if (this.shouldInvalidateAllQueries(endpoint)) {
            invalidateAllQueries();
          }
          requestToast?.succeed();
          return result;
        }

        requestToast?.fail((error as any)?.message || "Request failed");
        throw error;
      } finally {
        this.emitApiLoading(-1);
      }
    })();
  }

  /**
   * Set authorization token
   */
  public setAuthToken(token: string): void {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Remove authorization token
   */
  public removeAuthToken(): void {
    const { Authorization, ...rest } = this.defaultHeaders as any;
    this.defaultHeaders = rest;
  }
}

export const httpClient = HttpClient.getInstance();
