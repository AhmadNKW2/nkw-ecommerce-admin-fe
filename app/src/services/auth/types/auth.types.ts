/**
 * Authentication types matching backend API
 */

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  access_token: string;
  expires_in: number; // seconds until token expires
  user: User;
}

export interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  vendorId?: number | null;
  adminAccess?: import("@/lib/admin-access").AdminAccess;
}

export type UserRole =
  | "user"
  | "admin"
  | "constant_token_admin"
  | "catalog_manager"
  | "vendor_admin"
  | "store_admin";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpiresAt: number | null; // timestamp in milliseconds
}

export interface SessionInfo {
  expiresAt: number; // timestamp in milliseconds
  lastActivity: number; // timestamp in milliseconds
  rememberMe: boolean;
}

// Session events for cross-tab communication
export type SessionEventType = "logout" | "login" | "session_refresh" | "activity";

export interface SessionEvent {
  type: SessionEventType;
  timestamp: number;
  data?: unknown;
}
