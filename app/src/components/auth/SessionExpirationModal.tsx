/**
 * Session Expiration Warning Modal
 * Displays a countdown timer when the session is about to expire
 * Allows user to extend their session or logout
 */

"use client";

import React, { useEffect, useState } from "react";
import { Clock, LogOut, RefreshCw, AlertTriangle } from "lucide-react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface SessionExpirationModalProps {
  isOpen: boolean;
  expiresAt: number;
  timeRemaining: number;
  onExtendSession: () => void;
  onLogout: () => void;
  onDismiss: () => void;
}

export const SessionExpirationModal: React.FC<SessionExpirationModalProps> = ({
  isOpen,
  expiresAt: _expiresAt,
  timeRemaining,
  onExtendSession,
  onLogout,
  onDismiss,
}) => {
  const [isExtending, setIsExtending] = useState(false);

  // Format time remaining
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage (for circular timer)
  const progressPercentage = Math.max(
    0,
    Math.min(100, (timeRemaining / (5 * 60 * 1000)) * 100),
  );

  // Determine urgency level
  const isUrgent = timeRemaining < 60 * 1000; // Less than 1 minute
  const isCritical = timeRemaining < 30 * 1000; // Less than 30 seconds

  const accentClass = isCritical
    ? "text-danger"
    : isUrgent
      ? "text-danger"
      : "text-secondary";

  const handleExtend = async () => {
    setIsExtending(true);
    try {
      await onExtendSession();
    } finally {
      setIsExtending(false);
    }
  };

  // Auto-logout when time runs out
  useEffect(() => {
    if (timeRemaining <= 0 && isOpen) {
      onLogout();
    }
  }, [timeRemaining, isOpen, onLogout]);

  return (
    <Modal isOpen={isOpen} onClose={onDismiss} className="max-w-md">
      <div className="flex w-full flex-col items-center px-2 py-2">
        {/* Soft brand wash behind the timer */}
        <div className="relative mb-6">
          <div
            className={cn(
              "pointer-events-none absolute inset-0 -m-4 rounded-full blur-2xl",
              isCritical || isUrgent ? "bg-danger/15" : "bg-secondary/20",
            )}
            aria-hidden
          />

          <svg className="relative h-32 w-32 -rotate-90 transform">
            <circle
              cx="64"
              cy="64"
              r="58"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-primary/10"
            />
            <circle
              cx="64"
              cy="64"
              r="58"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 58}`}
              strokeDashoffset={`${2 * Math.PI * 58 * (1 - progressPercentage / 100)}`}
              className={cn("transition-all duration-1000", accentClass)}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Clock
              className={cn(
                "mb-1 h-7 w-7",
                accentClass,
                isCritical && "animate-pulse",
              )}
            />
            <span className={cn("font-mono text-2xl font-bold", accentClass)}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>

        <div className="mb-6 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <AlertTriangle className={cn("h-5 w-5", accentClass)} />
            <h3 className="text-lg font-semibold text-primary">
              Session Expiring Soon
            </h3>
          </div>
          <p className="text-sm text-primary2">
            Your session will expire in{" "}
            <span className={cn("font-semibold", accentClass)}>
              {formatTime(timeRemaining)}
            </span>
            .
            <br />
            Would you like to stay logged in?
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button
            onClick={handleExtend}
            disabled={isExtending}
            color="var(--color-primary)"
            className="w-full gap-2 shadow-s2"
          >
            <RefreshCw
              className={cn("h-4 w-4", isExtending && "animate-spin")}
            />
            {isExtending ? "Extending..." : "Stay Logged In"}
          </Button>

          <Button
            onClick={onLogout}
            variant="outline"
            color="var(--color-danger)"
            className="w-full gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout Now
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-primary2/80">
          For your security, sessions expire after periods of inactivity.
        </p>
      </div>
    </Modal>
  );
};
