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

    // Auth/session endpoints must never wipe the query cache (refresh loops).
    if (
      endpoint.includes("/auth/refresh") ||
      endpoint.includes("/auth/login") ||
      endpoint.includes("/auth/logout") ||
      endpoint.includes("/auth/profile")
    ) {
      return false;
    }

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

  /**
   * Large uploads bypass the admin /api proxy on Vercel (≈1MB serverless body cap).
   * Uses BACKEND_ORIGIN with Bearer auth; JSON calls keep using same-origin /api.
   */
  private getDirectUploadBaseUrl(): string | null {
    if (typeof window === "undefined") return null;

    const origin = API_CONFIG.backendOrigin;
    if (!origin) return null;

    try {
      const parsed = new URL(origin);
      if (parsed.origin === window.location.origin) return null;
      return `${parsed.origin}/api`;
    } catch {
      return null;
    }
  }

  private resolveUploadUrl(endpoint: string): string {
    const directBase = this.getDirectUploadBaseUrl();
    return `${directBase ?? this.baseURL}${endpoint}`;
  }

  private usesDirectUpload(endpoint: string): boolean {
    return this.getDirectUploadBaseUrl() !== null;
  }

  private async cloneFormDataBody(body: FormData): Promise<FormData> {
    const clone = new FormData();
    for (const [key, value] of body.entries()) {
      if (typeof value !== "string") {
        const file = value as File;
        const buffer = await file.arrayBuffer();
        clone.append(
          key,
          new File([buffer], file.name, {
            type: file.type,
            lastModified: file.lastModified,
          }),
        );
      } else {
        clone.append(key, value);
      }
    }
    return clone;
  }

  /** Ensure Bearer is set before cross-origin uploads (cookies are not sent to api.*). */
  private async ensureBearerTokenForDirectUpload(): Promise<void> {
    this.sanitizeExpiredBearerHeader();
    const authHeader = (this.defaultHeaders as Record<string, string>)
      .Authorization;
    if (authHeader) return;

    await this.refreshSessionTokens();
  }

  private decodeJwtPayload(token: string): { exp?: number } | null {
    try {
      const segment = token.split(".")[1];
      if (!segment) return null;
      const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(
        normalized.length + ((4 - (normalized.length % 4)) % 4),
        "="
      );
      const json = atob(padded);
      return JSON.parse(json) as { exp?: number };
    } catch {
      return null;
    }
  }

  private isBearerTokenExpired(token: string): boolean {
    const payload = this.decodeJwtPayload(token);
    // If we can't decode the payload, treat the token as unusable.
    // This avoids repeatedly sending a stale/invalid Authorization header.
    if (!payload) return true;
    if (!payload.exp) return false;
    return payload.exp <= Math.floor(Date.now() / 1000);
  }

  /**
   * Resolve session expiry from refresh/login payload.
   * Never return "now" for null/invalid expires_in — that caused refresh loops.
   */
  private resolveSessionExpiresAt(
    expiresIn: unknown,
    accessToken?: string,
  ): number {
    if (
      typeof expiresIn === "number" &&
      Number.isFinite(expiresIn) &&
      expiresIn > 0
    ) {
      return Date.now() + expiresIn * 1000;
    }

    if (accessToken) {
      const payload = this.decodeJwtPayload(accessToken);
      if (payload?.exp && payload.exp > 0) {
        return payload.exp * 1000;
      }
    }

    return Date.now() + 60 * 60 * 1000;
  }

  /**
   * Drop expired Bearer headers so httpOnly cookies are used instead.
   * OptionalJwtAuthGuard treats invalid Bearer as anonymous — that caused
   * admin /search to return storefront "card" rows without brand/image/etc.
   */
  private sanitizeExpiredBearerHeader(): void {
    const headers = this.defaultHeaders as Record<string, string>;
    const authHeader = headers.Authorization;
    if (!authHeader?.startsWith("Bearer ")) return;

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token || !this.isBearerTokenExpired(token)) return;

    this.removeAuthToken();
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
    } else {
      // Some deployments return only httpOnly cookies on refresh.
      // In that case, ensure we don't keep an old bearer header around.
      this.removeAuthToken();
    }

    const expiresIn = json.data?.expires_in ?? json.expires_in;
    const tokenForExpiry =
      typeof tokenFromBody === "string" && tokenFromBody.length > 0
        ? tokenFromBody
        : undefined;
    const expiresAt = this.resolveSessionExpiresAt(expiresIn, tokenForExpiry);
    const sessionInfo = sessionManager.getSessionInfo();
    sessionManager.setSessionInfo({
      ...(sessionInfo ?? { rememberMe: false }),
      expiresAt,
      lastActivity: Date.now(),
    });
    sessionManager.broadcastEvent({
      type: "session_refresh",
      timestamp: Date.now(),
    });

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
          cache: "no-store",
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

        let retryBody: BodyInit | null | undefined = originalRequest.options.body;
        if (isFormDataBody) {
          retryBody = await this.cloneFormDataBody(
            originalRequest.options.body as FormData,
          );
        }

        const retryUrl = isFormDataBody
          ? this.resolveUploadUrl(originalRequest.endpoint)
          : `${this.baseURL}${originalRequest.endpoint}`;

        // Retry the original request
        const retryResponse = await fetch(
          retryUrl,
          {
            ...originalRequest.options,
            body: retryBody,
            headers: retryHeaders,
            credentials: originalRequest.options.credentials ?? 'include',
            cache: 'no-store',
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

    this.sanitizeExpiredBearerHeader();

    let config: RequestInit = {
      ...options,
      credentials: 'include', // Always include cookies for auth
      cache: 'no-store',
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
   * Admin panel always sends is_admin=true so backend returns admin payloads
   * and (for search) does not expand category filters to subcategories.
   */
  public get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const [pathname, existingQuery = ""] = endpoint.split("?", 2);
    const searchParams = new URLSearchParams(existingQuery);
    const mergedParams: Record<string, any> = {
      ...(params ?? {}),
      is_admin: true,
    };

    Object.entries(mergedParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        // Allow callers to pass multi-value keys without leaving stale singles.
        searchParams.delete(key);
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, String(v)));
        } else {
          let strValue = String(value);
          // Protect against 414 URI Too Long by capping overly long search inputs generically
          if (key === "search" && strValue.length > 150) {
            strValue = strValue.slice(0, 150);
          }
          searchParams.append(key, strValue);
        }
      }
    });

    const str = searchParams.toString();
    const queryString = str ? `?${str}` : "";

    return this.request<T>(`${pathname}${queryString}`, {
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
    const requestToast = this.shouldShowRequestToast(endpoint)
      ? this.startRequestProgressToast("POST", endpoint)
      : null;

    return (async () => {
      this.emitApiLoading(1);
      try {
        this.sanitizeExpiredBearerHeader();
        const isDirectUpload = this.usesDirectUpload(endpoint);
        if (isDirectUpload) {
          await this.ensureBearerTokenForDirectUpload();
        }

        const url = this.resolveUploadUrl(endpoint);
        const headers: HeadersInit = {};
        const authHeader = (this.defaultHeaders as Record<string, string>)
          .Authorization;
        if (authHeader) {
          headers.Authorization = authHeader;
        }
        if (requestToast) {
          (headers as Record<string, string>)[HttpClient.REQUEST_TOAST_HEADER] =
            "1";
        }

        const credentials: RequestCredentials = isDirectUpload
          ? "omit"
          : "include";

        const response = await fetch(url, {
          method: "POST",
          headers: this.stripInternalHeaders({ headers }).headers as Headers,
          body: formData,
          credentials,
          cache: "no-store",
        });

        if (!response.ok) {
          await this.handleError(response, {
            endpoint,
            options: {
              method: "POST",
              headers,
              body: formData,
              credentials,
            },
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
   * PATCH request with FormData (for file uploads)
   * Invalidates all queries on success to ensure fresh data
   */
  public patchFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const requestToast = this.shouldShowRequestToast(endpoint)
      ? this.startRequestProgressToast("PATCH", endpoint)
      : null;

    return (async () => {
      this.emitApiLoading(1);
      try {
        this.sanitizeExpiredBearerHeader();
        const isDirectUpload = this.usesDirectUpload(endpoint);
        if (isDirectUpload) {
          await this.ensureBearerTokenForDirectUpload();
        }

        const url = this.resolveUploadUrl(endpoint);
        const headers: HeadersInit = {};
        const authHeader = (this.defaultHeaders as Record<string, string>)
          .Authorization;
        if (authHeader) {
          headers.Authorization = authHeader;
        }
        if (requestToast) {
          (headers as Record<string, string>)[HttpClient.REQUEST_TOAST_HEADER] =
            "1";
        }

        const credentials: RequestCredentials = isDirectUpload
          ? "omit"
          : "include";

        const response = await fetch(url, {
          method: "PATCH",
          headers: this.stripInternalHeaders({ headers }).headers as Headers,
          body: formData,
          credentials,
          cache: "no-store",
        });

        if (!response.ok) {
          await this.handleError(response, {
            endpoint,
            options: {
              method: "PATCH",
              headers,
              body: formData,
              credentials,
            },
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
