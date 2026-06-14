"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { API_CONFIG } from "../lib/constants";
import { httpClient } from "../lib/api/http-client";
import { sessionManager } from "../lib/session/session-manager";
import { authService } from "../services/auth/api/auth.service";
import { showErrorToast, showSuccessToast, showWarningToast } from "../lib/toast";

type JobType = "import" | "action";

type ParsedJobStatus = {
  status?: string;
  progress?: number | null;
  total?: number | null;
  currentIndex?: number | null;
  currentProduct?: string | null;
  result?: Record<string, unknown> | null;
  error?: string | null;
};

const getNumericResultValue = (result: Record<string, unknown> | null | undefined, key: string) => {
  const value = result?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const JOB_STATUS_POLL_INTERVAL_MS = 1500;
const ACTIVE_JOBS_STORAGE_KEY = "storefront_active_jobs";

const parseJobStatus = (value: unknown): ParsedJobStatus | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const payload =
    record.data && typeof record.data === "object" && !Array.isArray(record.data)
      ? (record.data as Record<string, unknown>)
      : record;

  return {
    status: typeof payload.status === "string" ? payload.status : undefined,
    progress: typeof payload.progress === "number" ? payload.progress : null,
    total: typeof payload.total === "number" ? payload.total : null,
    currentIndex: typeof payload.current_index === "number" ? payload.current_index : null,
    currentProduct:
      typeof payload.current_product === "string" ? payload.current_product : null,
    result:
      payload.result && typeof payload.result === "object" && !Array.isArray(payload.result)
        ? (payload.result as Record<string, unknown>)
        : null,
    error: typeof payload.error === "string" ? payload.error : null,
  };
};

const getJobStatusEndpoint = (job: JobMeta) =>
  job.type === "import"
    ? `${API_CONFIG.baseUrl}/products/import-jobs/${job.jobId}`
    : `${API_CONFIG.baseUrl}/products/jobs/${job.jobId}`;

const getJobStreamEndpoint = (job: JobMeta) =>
  job.type === "import"
    ? `${API_CONFIG.baseUrl}/products/import-jobs/${job.jobId}/stream`
    : `${API_CONFIG.baseUrl}/products/jobs/${job.jobId}/stream`;

export interface JobMeta {
  jobId: string;
  type: JobType;
  loadingMessage: string;
  successFallback: string;
  failureFallback: string;
  progress?: number;
  total?: number;
  currentIndex?: number;
  currentProduct?: string;
}

interface JobTrackerContextValue {
  addJob: (meta: JobMeta) => void;
  updateJobProgress: (
    jobId: string,
    progress: number,
    total: number,
    currentProduct?: string,
    currentIndex?: number,
  ) => void;
  activeJobs: JobMeta[];
}

const JobTrackerContext = createContext<JobTrackerContextValue | null>(null);

export const useJobTracker = () => {
  const context = useContext(JobTrackerContext);
  if (!context) {
    throw new Error("useJobTracker must be used within a JobTrackerProvider");
  }
  return context;
};

export const JobTrackerProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeJobs, setActiveJobs] = useState<JobMeta[]>([]);
  const hasInitialized = useRef(false);
  const eventSourcesRef = useRef(new Map<string, EventSource>());
  const pollIntervalsRef = useRef(new Map<string, number>());
  const pollingInFlightRef = useRef(new Set<string>());
  const settledJobsRef = useRef(new Set<string>());
  const authRefreshPromiseRef = useRef<Promise<boolean> | null>(null);

  // Re-hydrate jobs from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(ACTIVE_JOBS_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setActiveJobs(parsed);
          }
        } catch (e) {
          console.error("Failed to parse cached active jobs", e);
        }
      }
    }
  }, []);

  // Update localStorage when activeJobs changes locally
  useEffect(() => {
    if (hasInitialized.current) {
      if (activeJobs.length === 0) {
        localStorage.removeItem(ACTIVE_JOBS_STORAGE_KEY);
      } else {
        localStorage.setItem(ACTIVE_JOBS_STORAGE_KEY, JSON.stringify(activeJobs));
      }
    } else {
      hasInitialized.current = true;
    }
  }, [activeJobs]);

  const addJob = (meta: JobMeta) => {
    settledJobsRef.current.delete(meta.jobId);
    setActiveJobs((prev) => {
      // Avoid duplicate trackings
      if (prev.some((j) => j.jobId === meta.jobId)) return prev;
      return [...prev, meta];
    });
  };

  const removeJob = (jobId: string) => {
    setActiveJobs((prev) => prev.filter((j) => j.jobId !== jobId));
  };

  const updateJobProgress = (
    jobId: string,
    progress: number,
    total: number,
    currentProduct?: string,
    currentIndex?: number,
  ) => {
    setActiveJobs((prev) => {
      const existing = prev.find((j) => j.jobId === jobId);
      if (!existing) return prev;
      if (
        existing.progress === progress &&
        existing.total === total &&
        existing.currentProduct === currentProduct &&
        existing.currentIndex === currentIndex
      ) return prev;
      
      return prev.map(j => j.jobId === jobId ? { ...j, progress, total, currentProduct, currentIndex } : j);
    });
  };

  const refreshJobTrackingSession = async (): Promise<boolean> => {
    if (authRefreshPromiseRef.current) {
      return authRefreshPromiseRef.current;
    }

    authRefreshPromiseRef.current = (async () => {
      try {
        const response = await authService.refreshToken();

        if (!response.success || !response.data) {
          return false;
        }

        if (response.data.access_token) {
          httpClient.setAuthToken(response.data.access_token);
        }

        if (typeof response.data.expires_in === "number") {
          const sessionInfo = sessionManager.getSessionInfo();

          sessionManager.setSessionInfo({
            ...(sessionInfo ?? { rememberMe: false }),
            expiresAt: Date.now() + response.data.expires_in * 1000,
            lastActivity: Date.now(),
          });

          sessionManager.broadcastEvent({
            type: "session_refresh",
            timestamp: Date.now(),
          });
        }

        return true;
      } catch {
        return false;
      } finally {
        authRefreshPromiseRef.current = null;
      }
    })();

    return authRefreshPromiseRef.current;
  };

  const fetchJobStatus = async (
    job: JobMeta,
    allowRefresh = true,
  ): Promise<Response> => {
    const response = await fetch(getJobStatusEndpoint(job), {
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (response.status === 401 && allowRefresh) {
      const refreshed = await refreshJobTrackingSession();

      if (refreshed) {
        return fetchJobStatus(job, false);
      }
    }

    return response;
  };

  const activeJobIds = activeJobs.map(j => j.jobId).join(",");

  const stopTrackingJob = (jobId: string) => {
    const eventSource = eventSourcesRef.current.get(jobId);
    if (eventSource) {
      eventSource.close();
      eventSourcesRef.current.delete(jobId);
    }

    const pollInterval = pollIntervalsRef.current.get(jobId);
    if (pollInterval !== undefined) {
      window.clearInterval(pollInterval);
      pollIntervalsRef.current.delete(jobId);
    }

    pollingInFlightRef.current.delete(jobId);
  };

  const settleJob = (job: JobMeta, status: ParsedJobStatus) => {
    if (settledJobsRef.current.has(job.jobId)) {
      return;
    }

    settledJobsRef.current.add(job.jobId);
    stopTrackingJob(job.jobId);

    if (status.status === "done") {
      const matched = getNumericResultValue(status.result, "matched");
      const reimported = getNumericResultValue(status.result, "reimported");
      const failed = getNumericResultValue(status.result, "failed");
      const message =
        typeof status.result?.message === "string" && status.result.message.trim()
          ? status.result.message
          : job.successFallback;

      if (matched !== null && reimported !== null && failed !== null) {
        if (failed === 0) {
          showSuccessToast(message);
        } else if (reimported === 0) {
          showErrorToast(`Bulk review re-import finished. 0 of ${matched} products succeeded and ${failed} failed.`);
        } else {
          showWarningToast(`Bulk review re-import finished. ${reimported} of ${matched} succeeded and ${failed} failed.`);
        }
      } else {
        showSuccessToast(message);
      }
    } else if (status.status === "failed" || status.status === "cancelled") {
      const message = status.error || job.failureFallback;
      showErrorToast(message);
    }

    removeJob(job.jobId);
  };

  const handleJobStatus = (job: JobMeta, status: ParsedJobStatus | null) => {
    if (!status?.status) {
      return;
    }

    if (status.status === "running") {
      if (typeof status.progress === "number" && typeof status.total === "number") {
        updateJobProgress(
          job.jobId,
          status.progress,
          status.total,
          status.currentProduct ?? undefined,
          status.currentIndex ?? undefined,
        );
      }
      return;
    }

    settleJob(job, status);
  };

  const pollJobStatus = async (job: JobMeta) => {
    if (pollingInFlightRef.current.has(job.jobId) || settledJobsRef.current.has(job.jobId)) {
      return;
    }

    pollingInFlightRef.current.add(job.jobId);

    try {
      const response = await fetchJobStatus(job);

      if (response.status === 404) {
        stopTrackingJob(job.jobId);
        removeJob(job.jobId);
        return;
      }

      if (!response.ok) {
        return;
      }

      const status = parseJobStatus(await response.json());
      handleJobStatus(job, status);
    } catch {
      // Keep the job visible and let the next poll or SSE event recover.
    } finally {
      pollingInFlightRef.current.delete(job.jobId);
    }
  };

  useEffect(() => {
    // Only rebuild connections when the actual jobs list changes, not when progress updates
    const currentIds = new Set(activeJobIds ? activeJobIds.split(",") : []);

    // Clean up removed jobs
    eventSourcesRef.current.forEach((_es, id) => {
      if (!currentIds.has(id)) {
        stopTrackingJob(id);
        settledJobsRef.current.delete(id);
      }
    });

    pollIntervalsRef.current.forEach((_intervalId, id) => {
      if (!currentIds.has(id)) {
        stopTrackingJob(id);
        settledJobsRef.current.delete(id);
      }
    });

    // Add new jobs
    activeJobs.forEach((job) => {
      if (!pollIntervalsRef.current.has(job.jobId)) {
        void pollJobStatus(job);
        const intervalId = window.setInterval(() => {
          void pollJobStatus(job);
        }, JOB_STATUS_POLL_INTERVAL_MS);
        pollIntervalsRef.current.set(job.jobId, intervalId);
      }

      if (eventSourcesRef.current.has(job.jobId)) {
        return;
      }

      const es = new EventSource(getJobStreamEndpoint(job), {
        withCredentials: true,
      });

      eventSourcesRef.current.set(job.jobId, es);

      es.onmessage = (e) => {
        try {
          handleJobStatus(job, parseJobStatus(JSON.parse(e.data)));
        } catch (error) {
          console.error("Failed to parse SSE payload", error);
        }
      };

      es.onerror = () => {
        es.close();
        eventSourcesRef.current.delete(job.jobId);
        void pollJobStatus(job);
      };
    });
  }, [activeJobIds]);

  // Clean up all EventSources when the provider itself completely unmounts
  useEffect(() => {
    return () => {
      eventSourcesRef.current.forEach((es) => es.close());
      eventSourcesRef.current.clear();
      pollIntervalsRef.current.forEach((intervalId) => window.clearInterval(intervalId));
      pollIntervalsRef.current.clear();
      pollingInFlightRef.current.clear();
      settledJobsRef.current.clear();
    };
  }, []);

  return (
    <JobTrackerContext.Provider value={{ addJob, updateJobProgress, activeJobs }}>
      {children}
    </JobTrackerContext.Provider>
  );
};
