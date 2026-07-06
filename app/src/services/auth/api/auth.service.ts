/**
 * Auth API Service
 * Handles authentication with cookie-based tokens
 */

import { httpClient } from "../../../lib/api/http-client";
import { ApiResponse } from "../../../types/common.types";
import { LoginRequest, LoginResponse, RefreshTokenResponse, User } from "../types/auth.types";

const AUTH_ENDPOINTS = {
  LOGIN: "/auth/login",
  LOGOUT: "/auth/logout",
  REFRESH: "/auth/refresh",
  PROFILE: "/auth/profile",
} as const;

export const authService = {
  /**
   * Login with email and password
   * Backend sets httpOnly cookies for access_token and refresh_token
   */
  login: (data: LoginRequest) => {
    return httpClient.post<ApiResponse<LoginResponse>>(
      AUTH_ENDPOINTS.LOGIN,
      data
    );
  },

  /**
   * Logout current user
   * Backend clears the httpOnly cookies
   */
  logout: () => {
    return httpClient.post<ApiResponse<void>>(AUTH_ENDPOINTS.LOGOUT);
  },

  /**
   * Refresh access token using refresh token cookie
   * Backend reads refresh_token from cookie and issues new access_token
   */
  refreshToken: () => httpClient.refreshSessionTokens(),

  /**
   * Get current user profile
   * Uses access_token from cookie for authentication
   */
  getProfile: () => {
    return httpClient.get<ApiResponse<User>>(
      AUTH_ENDPOINTS.PROFILE
    );
  },

  /**
   * Validate current session by calling /profile endpoint
   * Returns true if session is valid, false otherwise
   */
  validateSession: async (): Promise<{ valid: boolean; user?: User }> => {
    try {
      const response = await httpClient.get<ApiResponse<User>>(AUTH_ENDPOINTS.PROFILE);
      return { valid: true, user: response.data };
    } catch {
      return { valid: false };
    }
  },
};
