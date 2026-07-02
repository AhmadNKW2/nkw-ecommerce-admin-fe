/**
 * Brand API Service
 * Mirrors vendor service for parity (archive/restore/delete, product assignment)
 */

import { httpClient } from "../../../lib/api/http-client";
import { appendProductChangesField } from "../../../lib/product-changes";
import { ApiResponse, PaginatedApiResponse } from "../../../types/common.types";
import {
  Brand,
  BrandQueryParams,
  CreateBrandDto,
  UpdateBrandDto,
  ReorderBrandsDto,
  PermanentDeleteBrandDto,
  RestoreBrandDto,
  BrandRestoreResult,
} from "../types/brand.types";

class BrandService {
  private endpoint = "/brands";

  async getBrands(params?: BrandQueryParams): Promise<PaginatedApiResponse<Brand>> {
    return httpClient.get<PaginatedApiResponse<Brand>>(this.endpoint, params as Record<string, any>);
  }

  async getBrand(id: number): Promise<ApiResponse<Brand>> {
    return httpClient.get<ApiResponse<Brand>>(`${this.endpoint}/${id}`, {
      is_admin: true,
    });
  }

  async createBrand(data: CreateBrandDto): Promise<ApiResponse<Brand>> {
    const formData = new FormData();

    formData.append("name_en", data.name_en);
    formData.append("name_ar", data.name_ar);

    if (data.description_en) {
      formData.append("description_en", data.description_en);
    }

    if (data.description_ar) {
      formData.append("description_ar", data.description_ar);
    }

    if (data.visible !== undefined) {
      formData.append("visible", String(data.visible));
    }

    if (data.logo) {
      formData.append("logo", data.logo);
    }

    appendProductChangesField(formData, data.product_changes);

    return httpClient.postFormData<ApiResponse<Brand>>(this.endpoint, formData);
  }

  async updateBrand(id: number, data: UpdateBrandDto): Promise<ApiResponse<Brand>> {
    const formData = new FormData();

    if (data.name_en !== undefined) {
      formData.append("name_en", data.name_en);
    }

    if (data.name_ar !== undefined) {
      formData.append("name_ar", data.name_ar);
    }

    if (data.description_en !== undefined) {
      formData.append("description_en", data.description_en);
    }

    if (data.description_ar !== undefined) {
      formData.append("description_ar", data.description_ar);
    }

    if (data.visible !== undefined) {
      formData.append("visible", String(data.visible));
    }

    if (data.logo) {
      formData.append("logo", data.logo);
    }

    appendProductChangesField(formData, data.product_changes);

    return httpClient.patchFormData<ApiResponse<Brand>>(`${this.endpoint}/${id}`.trim(), formData);
  }

  async reorderBrands(data: ReorderBrandsDto): Promise<ApiResponse<void>> {
    return httpClient.put<ApiResponse<void>>(`${this.endpoint}/reorder`, data);
  }

  async archiveBrand(id: number): Promise<ApiResponse<void>> {
    return httpClient.post<ApiResponse<void>>(`${this.endpoint}/${id}/archive`);
  }

  async restoreBrand(id: number, data?: RestoreBrandDto): Promise<ApiResponse<BrandRestoreResult>> {
    return httpClient.post<ApiResponse<BrandRestoreResult>>(`${this.endpoint}/${id}/restore`, data);
  }

  async getArchivedBrands(): Promise<ApiResponse<Brand[]>> {
    return httpClient.get<ApiResponse<Brand[]>>(`${this.endpoint}/archive/list`);
  }

  async permanentDeleteBrand(id: number, data?: PermanentDeleteBrandDto): Promise<ApiResponse<void>> {
    return httpClient.delete<ApiResponse<void>>(`${this.endpoint}/${id}/permanent`, data);
  }

  /**
   * @deprecated Use archiveBrand instead
   */
  async deleteBrand(id: number): Promise<ApiResponse<void>> {
    return this.archiveBrand(id);
  }

  async getProducts(id: number): Promise<ApiResponse<{ brand: Brand; products: any[] }>> {
    return httpClient.get<ApiResponse<{ brand: Brand; products: any[] }>>(`${this.endpoint}/${id}/products`);
  }

  async assignProducts(id: number, product_ids: number[]): Promise<ApiResponse<void>> {
    return httpClient.post<ApiResponse<void>>(`${this.endpoint}/${id}/products`, { product_ids });
  }

  async removeProducts(id: number, product_ids: number[]): Promise<ApiResponse<void>> {
    return httpClient.delete<ApiResponse<void>>(`${this.endpoint}/${id}/products`, { product_ids });
  }
}

export const brandService = new BrandService();
