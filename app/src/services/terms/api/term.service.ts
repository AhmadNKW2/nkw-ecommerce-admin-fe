import { httpClient } from "../../../lib/api/http-client";
import { ApiResponse } from "../../../types/common.types";
import {
  CancelTermsJobResponse,
  ClearConceptsResponse,
  ConceptCoverageResponse,
  CreateTermGroupRequest,
  DeleteTermGroupResponse,
  GenerateTermsRequest,
  PauseResumeTermsJobResponse,
  StartTermsJobResponse,
  TermGroupItem,
  TermGroupsListResponse,
  TermsJobStatusResponse,
  UpdateTermGroupRequest,
} from "../types/term.types";

class TermService {
  private endpoint = "/terms";

  async generateTerms(
    data: GenerateTermsRequest,
  ): Promise<ApiResponse<StartTermsJobResponse>> {
    return httpClient.post<ApiResponse<StartTermsJobResponse>>(
      `${this.endpoint}/generate`,
      data,
      { headers: { "x-skip-request-toast": "1" } },
    );
  }

  async getTermsJobStatus(
    jobId: string,
  ): Promise<ApiResponse<TermsJobStatusResponse>> {
    return httpClient.get<ApiResponse<TermsJobStatusResponse>>(
      `${this.endpoint}/jobs/${jobId}`,
    );
  }

  async cancelTermsJob(
    jobId: string,
  ): Promise<ApiResponse<CancelTermsJobResponse>> {
    return httpClient.post<ApiResponse<CancelTermsJobResponse>>(
      `${this.endpoint}/jobs/${jobId}/cancel`,
      undefined,
      { headers: { "x-skip-request-toast": "1" } },
    );
  }

  async pauseTermsJob(
    jobId: string,
  ): Promise<ApiResponse<PauseResumeTermsJobResponse>> {
    return httpClient.post<ApiResponse<PauseResumeTermsJobResponse>>(
      `${this.endpoint}/jobs/${jobId}/pause`,
      undefined,
      { headers: { "x-skip-request-toast": "1" } },
    );
  }

  async clearAllConcepts(): Promise<ApiResponse<ClearConceptsResponse>> {
    return httpClient.post<ApiResponse<ClearConceptsResponse>>(
      `${this.endpoint}/clear-concepts`,
      undefined,
      { headers: { "x-skip-request-toast": "1" } },
    );
  }

  async resumeTermsJob(
    jobId: string,
  ): Promise<ApiResponse<PauseResumeTermsJobResponse>> {
    return httpClient.post<ApiResponse<PauseResumeTermsJobResponse>>(
      `${this.endpoint}/jobs/${jobId}/resume`,
      undefined,
      { headers: { "x-skip-request-toast": "1" } },
    );
  }

  async listTermGroups(params?: {
    page?: number;
    per_page?: number;
    search?: string;
  }): Promise<ApiResponse<TermGroupsListResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) {
      searchParams.set("page", String(params.page));
    }
    if (params?.per_page) {
      searchParams.set("per_page", String(params.per_page));
    }
    if (params?.search) {
      searchParams.set("search", params.search);
    }

    const query = searchParams.toString();
    return httpClient.get<ApiResponse<TermGroupsListResponse>>(
      `${this.endpoint}${query ? `?${query}` : ""}`,
    );
  }

  async getConceptCoverage(): Promise<ApiResponse<ConceptCoverageResponse>> {
    return httpClient.get<ApiResponse<ConceptCoverageResponse>>(
      `${this.endpoint}/coverage`,
    );
  }

  async getTermGroup(id: number): Promise<ApiResponse<TermGroupItem>> {
    return httpClient.get<ApiResponse<TermGroupItem>>(`${this.endpoint}/${id}`);
  }

  async createTermGroup(
    data: CreateTermGroupRequest,
  ): Promise<ApiResponse<TermGroupItem>> {
    return httpClient.post<ApiResponse<TermGroupItem>>(this.endpoint, data);
  }

  async updateTermGroup(
    id: number,
    data: UpdateTermGroupRequest,
  ): Promise<ApiResponse<TermGroupItem>> {
    return httpClient.patch<ApiResponse<TermGroupItem>>(
      `${this.endpoint}/${id}`,
      data,
    );
  }

  async deleteTermGroup(
    id: number,
  ): Promise<ApiResponse<DeleteTermGroupResponse>> {
    return httpClient.delete<ApiResponse<DeleteTermGroupResponse>>(
      `${this.endpoint}/${id}`,
    );
  }
}

export const termService = new TermService();
