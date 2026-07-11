import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import { showSuccessToast } from "../../../lib/toast";
import { termService } from "../api/term.service";
import { CreateTermGroupRequest, GenerateTermsRequest, UpdateTermGroupRequest } from "../types/term.types";

export const useGenerateTerms = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateTermsRequest) => termService.generateTerms(data),
    onSuccess: () => {
      showSuccessToast("Terms generation started");
      queryClient.invalidateQueries({ queryKey: queryKeys.terms.all });
    },
  });
};

export const useTermsJobStatus = (
  jobId: string | null,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: queryKeys.terms.generationJob(jobId ?? "none"),
    queryFn: () => termService.getTermsJobStatus(jobId!),
    select: (response) => response.data,
    enabled: (options?.enabled ?? true) && !!jobId,
  });
};

export const useCancelTermsJob = () => {
  return useMutation({
    mutationFn: (jobId: string) => termService.cancelTermsJob(jobId),
    onSuccess: () => {
      showSuccessToast("Terms generation stop requested");
    },
  });
};

export const usePauseTermsJob = () => {
  return useMutation({
    mutationFn: (jobId: string) => termService.pauseTermsJob(jobId),
    onSuccess: () => {
      showSuccessToast("Terms generation paused");
    },
  });
};

export const useResumeTermsJob = () => {
  return useMutation({
    mutationFn: (jobId: string) => termService.resumeTermsJob(jobId),
    onSuccess: () => {
      showSuccessToast("Terms generation resumed");
    },
  });
};

export const useClearAllConcepts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => termService.clearAllConcepts(),
    onSuccess: () => {
      showSuccessToast("All concepts removed");
      queryClient.invalidateQueries({ queryKey: queryKeys.terms.all });
    },
  });
};

export const useTermGroups = (params?: {
  page?: number;
  per_page?: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.terms.list(params),
    queryFn: () => termService.listTermGroups(params),
    select: (response) => response.data,
  });
};

export const useConceptCoverage = () => {
  return useQuery({
    queryKey: queryKeys.terms.coverage(),
    queryFn: () => termService.getConceptCoverage(),
    select: (response) => response.data,
  });
};

export const useCreateTermGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermGroupRequest) => termService.createTermGroup(data),
    onSuccess: () => {
      showSuccessToast("Concept created");
      queryClient.invalidateQueries({ queryKey: queryKeys.terms.all });
    },
  });
};

export const useUpdateTermGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTermGroupRequest }) =>
      termService.updateTermGroup(id, data),
    onSuccess: () => {
      showSuccessToast("Concept updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.terms.all });
    },
  });
};

export const useDeleteTermGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => termService.deleteTermGroup(id),
    onSuccess: () => {
      showSuccessToast("Concept deleted");
      queryClient.invalidateQueries({ queryKey: queryKeys.terms.all });
    },
  });
};
