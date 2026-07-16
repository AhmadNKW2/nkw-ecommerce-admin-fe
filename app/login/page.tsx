/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Login Page - Admin Authentication
 */

"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../src/contexts/auth.context";
import { useLoading } from "../src/providers/loading-provider";
import { Input } from "../src/components/ui/input";
import { Button } from "../src/components/ui/button";
import { Card } from "../src/components/ui/card";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { AdminLogo } from "../src/components/common/AdminLogo";
import { useResolvedSiteBranding } from "../src/hooks/use-resolved-site-branding";

export default function LoginPage() {
  const { login, isLoading, isAuthenticated } = useAuth();
  const { setShowOverlay } = useLoading();
  const {
    dashboardTitle,
    siteName,
    siteLogo,
    isBrandingPending,
  } = useResolvedSiteBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Never block the login form behind a full-screen overlay on mobile.
  useEffect(() => {
    setShowOverlay(false);
  }, [setShowOverlay]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = dashboardTitle;
    }
  }, [dashboardTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err?.message || "Login failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-primary/10 px-4 py-8 sm:px-6">
      <Card className="w-full max-w-md !gap-5 !p-5 sm:!p-8">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <AdminLogo
              src={siteLogo}
              pending={isBrandingPending}
              alt={siteName}
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Admin Login
          </h1>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Sign in to your account
          </p>
        </div>

        {error && (
          <div className="rounded-r1 border border-danger bg-danger/10 p-4 flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting || (isLoading && isAuthenticated)}
            autoComplete="email"
            inputMode="email"
          />

          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting || (isLoading && isAuthenticated)}
            autoComplete="current-password"
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-primary/50 transition-colors hover:text-primary"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />

          <Button
            type="submit"
            className="w-full !h-12"
            disabled={isSubmitting || !email || !password}
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="text-center text-sm text-gray-500">
          <p>{dashboardTitle}</p>
        </div>
      </Card>
    </div>
  );
}
