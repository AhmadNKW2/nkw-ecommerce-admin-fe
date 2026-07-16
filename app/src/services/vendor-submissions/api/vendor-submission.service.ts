import { httpClient } from "../../../lib/api/http-client";
import type {
  ApiResponse,
  PaginatedApiResponse,
} from "../../../types/common.types";
import type {
  ApproveCatalogRequestInput,
  CatalogRequest,
  CreateVendorSubmissionInput,
  ListCatalogRequestsParams,
  ListVendorSubmissionsParams,
  VendorSubmission,
} from "../types/vendor-submission.types";

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return "";
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

class VendorSubmissionService {
  private endpoint = "/vendor-submissions";

  create(
    input: CreateVendorSubmissionInput,
  ): Promise<ApiResponse<VendorSubmission>> {
    return httpClient.post<ApiResponse<VendorSubmission>>(this.endpoint, input);
  }

  list(
    params?: ListVendorSubmissionsParams,
  ): Promise<PaginatedApiResponse<VendorSubmission>> {
    return httpClient.get<PaginatedApiResponse<VendorSubmission>>(
      `${this.endpoint}${toQuery(params as Record<string, unknown>)}`,
    );
  }

  getOne(id: number): Promise<ApiResponse<VendorSubmission>> {
    return httpClient.get<ApiResponse<VendorSubmission>>(
      `${this.endpoint}/${id}`,
    );
  }

  runAi(id: number): Promise<ApiResponse<VendorSubmission>> {
    return httpClient.post<ApiResponse<VendorSubmission>>(
      `${this.endpoint}/${id}/run-ai`,
      {},
    );
  }

  materialize(id: number): Promise<ApiResponse<{ product_id: number }>> {
    return httpClient.post<ApiResponse<{ product_id: number }>>(
      `${this.endpoint}/${id}/materialize`,
      {},
    );
  }
}

class CatalogRequestService {
  private endpoint = "/catalog-requests";

  list(
    params?: ListCatalogRequestsParams,
  ): Promise<PaginatedApiResponse<CatalogRequest>> {
    return httpClient.get<PaginatedApiResponse<CatalogRequest>>(
      `${this.endpoint}${toQuery(params as Record<string, unknown>)}`,
    );
  }

  pendingCount(): Promise<ApiResponse<{ count: number }>> {
    return httpClient.get<ApiResponse<{ count: number }>>(
      `${this.endpoint}/pending-count`,
    );
  }

  approve(
    id: number,
    input: ApproveCatalogRequestInput,
  ): Promise<ApiResponse<CatalogRequest>> {
    return httpClient.post<ApiResponse<CatalogRequest>>(
      `${this.endpoint}/${id}/approve`,
      input,
    );
  }

  reject(
    id: number,
    admin_notes?: string,
  ): Promise<ApiResponse<CatalogRequest>> {
    return httpClient.post<ApiResponse<CatalogRequest>>(
      `${this.endpoint}/${id}/reject`,
      { admin_notes },
    );
  }
}

export const vendorSubmissionService = new VendorSubmissionService();
export const catalogRequestService = new CatalogRequestService();
