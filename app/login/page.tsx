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

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const { setShowOverlay } = useLoading();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Show loading overlay while checking auth
  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Admin Dashboard";
    }
  }, []);

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

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center  px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold ">Admin Login</h1>
          <p className=" mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger rounded-r1 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
            />
          </div>

          <div>
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="current-password"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-primary/50 hover:text-primary transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !email || !password}
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="text-center text-sm ">
          <p>Admin Dashboard</p>
        </div>
      </Card>
    </div>
  );
}
