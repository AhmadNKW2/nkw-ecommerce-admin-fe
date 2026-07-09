import { useMutation, useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import { showSuccessToast } from "../../../lib/toast";
import { tagService } from "../api/tag.service";
import { GenerateCategoryTagsRequest } from "../types/tag.types";

export const useGenerateCategoryTags = () => {
  return useMutation({
    mutationFn: (data: GenerateCategoryTagsRequest) =>
      tagService.generateCategoryTags(data),
    onSuccess: () => {
      showSuccessToast("Category tags generation started");
    },
  });
};

export const useCategoryTagsJobStatus = (
  jobId: string | null,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: queryKeys.tags.generationJob(jobId ?? "none"),
    queryFn: () => tagService.getCategoryTagsJobStatus(jobId!),
    select: (response) => response.data,
    enabled: (options?.enabled ?? true) && !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data?.data;
      if (!data) {
        return 2000;
      }
      return data.status === "running" ? 2000 : false;
    },
  });
};

export const useCancelCategoryTagsJob = () => {
  return useMutation({
    mutationFn: (jobId: string) => tagService.cancelCategoryTagsJob(jobId),
    onSuccess: () => {
      showSuccessToast("Tag generation stop requested");
    },
  });
};
