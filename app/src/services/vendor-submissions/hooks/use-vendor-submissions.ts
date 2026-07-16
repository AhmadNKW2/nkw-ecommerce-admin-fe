import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { showSuccessToast } from "../../../lib/toast";
import {
  catalogRequestService,
  vendorSubmissionService,
} from "../api/vendor-submission.service";
import type {
  ApproveCatalogRequestInput,
  CreateVendorSubmissionInput,
  ListCatalogRequestsParams,
  ListVendorSubmissionsParams,
} from "../types/vendor-submission.types";

const submissionKeys = {
  all: ["vendor-submissions"] as const,
  list: (params?: ListVendorSubmissionsParams) =>
    ["vendor-submissions", "list", params ?? {}] as const,
  detail: (id: number) => ["vendor-submissions", "detail", id] as const,
};

const catalogKeys = {
  all: ["catalog-requests"] as const,
  list: (params?: ListCatalogRequestsParams) =>
    ["catalog-requests", "list", params ?? {}] as const,
  pendingCount: ["catalog-requests", "pending-count"] as const,
};

export function useVendorSubmissions(
  params?: ListVendorSubmissionsParams,
  options?: { enabled?: boolean; refetchInterval?: number },
) {
  return useQuery({
    queryKey: submissionKeys.list(params),
    queryFn: () => vendorSubmissionService.list(params),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });
}

export function useVendorSubmission(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: submissionKeys.detail(id),
    queryFn: () => vendorSubmissionService.getOne(id),
    enabled: options?.enabled ?? !!id,
    select: (r) => r.data,
  });
}

export function useCreateVendorSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVendorSubmissionInput) =>
      vendorSubmissionService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.all });
      showSuccessToast("Submission sent. AI is processing it now.");
    },
  });
}

export function useRunSubmissionAi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => vendorSubmissionService.runAi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.all });
      showSuccessToast("AI mapping re-run complete.");
    },
  });
}

export function useMaterializeSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => vendorSubmissionService.materialize(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.all });
      showSuccessToast("Product created from submission.");
    },
  });
}

export function useCatalogRequests(
  params?: ListCatalogRequestsParams,
  options?: { enabled?: boolean; refetchInterval?: number },
) {
  return useQuery({
    queryKey: catalogKeys.list(params),
    queryFn: () => catalogRequestService.list(params),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });
}

export function useCatalogRequestsPendingCount(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: catalogKeys.pendingCount,
    queryFn: () => catalogRequestService.pendingCount(),
    enabled: options?.enabled ?? true,
    select: (r) => r.data?.count ?? 0,
    refetchInterval: 30000,
  });
}

export function useApproveCatalogRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: ApproveCatalogRequestInput;
    }) => catalogRequestService.approve(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.all });
      queryClient.invalidateQueries({ queryKey: submissionKeys.all });
      showSuccessToast("Request approved.");
    },
  });
}

export function useRejectCatalogRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, admin_notes }: { id: number; admin_notes?: string }) =>
      catalogRequestService.reject(id, admin_notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.all });
      showSuccessToast("Request rejected.");
    },
  });
}
