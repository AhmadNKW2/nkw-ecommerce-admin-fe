import { httpClient } from "../../../lib/api/http-client";
import { ApiResponse } from "../../../types/common.types";
import {
  CategoryTagsJobStatusResponse,
  GenerateCategoryTagsRequest,
  StartCategoryTagsJobResponse,
} from "../types/tag.types";

class TagService {
  private endpoint = "/categories/tags";

  async generateCategoryTags(
    data: GenerateCategoryTagsRequest,
  ): Promise<ApiResponse<StartCategoryTagsJobResponse>> {
    return httpClient.post<ApiResponse<StartCategoryTagsJobResponse>>(
      `${this.endpoint}/generate`,
      data,
      { headers: { "x-skip-request-toast": "1" } },
    );
  }

  async getCategoryTagsJobStatus(
    jobId: string,
  ): Promise<ApiResponse<CategoryTagsJobStatusResponse>> {
    return httpClient.get<ApiResponse<CategoryTagsJobStatusResponse>>(
      `${this.endpoint}/jobs/${jobId}`,
    );
  }
}

export const tagService = new TagService();
