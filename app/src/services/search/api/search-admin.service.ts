import { httpClient } from '../../../lib/api/http-client';
import { ApiResponse } from '../../../types/common.types';
import {
  ClearTypesenseCollectionResponse,
  InvalidateSearchCacheResponse,
  StartTypesenseBackfillResponse,
  TypesenseBackfillStatus,
} from '../types/search-admin.types';

class SearchAdminService {
  private endpoint = '/admin/search';

  async invalidateSearchCache(): Promise<ApiResponse<InvalidateSearchCacheResponse>> {
    return httpClient.post<ApiResponse<InvalidateSearchCacheResponse>>(
      `${this.endpoint}/cache/invalidate`,
      undefined,
      { headers: { 'x-skip-request-toast': '1' } },
    );
  }

  async startTypesenseBackfill(): Promise<ApiResponse<StartTypesenseBackfillResponse>> {
    return httpClient.post<ApiResponse<StartTypesenseBackfillResponse>>(
      `${this.endpoint}/typesense/backfill`,
      undefined,
      { headers: { 'x-skip-request-toast': '1' } },
    );
  }

  async clearTypesenseCollection(): Promise<ApiResponse<ClearTypesenseCollectionResponse>> {
    return httpClient.post<ApiResponse<ClearTypesenseCollectionResponse>>(
      `${this.endpoint}/typesense/clear`,
      undefined,
      { headers: { 'x-skip-request-toast': '1' } },
    );
  }

  async getTypesenseBackfillStatus(): Promise<ApiResponse<TypesenseBackfillStatus>> {
    return httpClient.get<ApiResponse<TypesenseBackfillStatus>>(
      `${this.endpoint}/typesense/backfill/status`,
    );
  }
}

export const searchAdminService = new SearchAdminService();
