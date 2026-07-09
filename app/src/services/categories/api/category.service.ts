/**
 * Category API Service
 * Handles all category-related API calls
 */

import { httpClient } from "../../../lib/api/http-client";
import { appendProductChangesField } from "../../../lib/product-changes";
import { ApiResponse } from "../../../types/common.types";
import {
  Category,
  CreateCategoryDto,
  UpdateCategoryDto,
  FilterCategoriesDto,
  ReorderCategoriesDto,
  RestoreCategoryDto,
  PermanentDeleteCategoryDto,
  CategoryRestoreResult,
} from "../types/category.types";

class CategoryService {
  private endpoint = "/categories";

  /**
   * Get all categories
   */
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return httpClient.get<ApiResponse<Category[]>>(this.endpoint);
  }

  /**
   * Get category tree
   */
  async getCategoryTree(): Promise<ApiResponse<Category[]>> {
    return httpClient.get<ApiResponse<Category[]>>(`${this.endpoint}/tree`);
  }

  /**
   * Get main categories (root categories only)
   */
  async getMainCategories(): Promise<ApiResponse<Category[]>> {
    return httpClient.get<ApiResponse<Category[]>>(`${this.endpoint}/main`);
  }

  /**
   * Filter categories
   */
  async filterCategories(
    filters: FilterCategoriesDto
  ): Promise<ApiResponse<Category[]>> {
    return httpClient.post<ApiResponse<Category[]>>(
      `${this.endpoint}/filter`,
      filters
    );
  }

  /**
   * Get a single category by ID
   */
  async getCategory(id: number): Promise<ApiResponse<Category>> {
    return httpClient.get<ApiResponse<Category>>(`${this.endpoint}/${id}`, {
      is_admin: true,
    });
  }

  /**
   * Create a new category
   * Uses FormData for file upload
   */
  async createCategory(data: CreateCategoryDto): Promise<ApiResponse<Category>> {
    const formData = new FormData();
    
    formData.append("name_en", data.name_en);
    formData.append("name_ar", data.name_ar);
    
    if (data.description_en) {
      formData.append("description_en", data.description_en);
    }
    
    if (data.description_ar) {
      formData.append("description_ar", data.description_ar);
    }

    if (data.tags_en !== undefined) {
      formData.append("tags_en", JSON.stringify(data.tags_en));
    }

    if (data.tags_ar !== undefined) {
      formData.append("tags_ar", JSON.stringify(data.tags_ar));
    }
    
    if (data.visible !== undefined) {
      formData.append("visible", String(data.visible));
    }
    
    if (data.is_active !== undefined) {
      formData.append("is_active", String(data.is_active));
    }
    
    if (data.parent_id) {
      formData.append("parent_id", String(data.parent_id));
    }
    
    if (data.image) {
      formData.append("image", data.image);
    }

    appendProductChangesField(formData, data.product_changes);

    if (data.attribute_ids !== undefined) {
      formData.append("attribute_ids", JSON.stringify(data.attribute_ids));
    }

    if (data.specification_ids !== undefined) {
      formData.append("specification_ids", JSON.stringify(data.specification_ids));
    }

    return httpClient.postFormData<ApiResponse<Category>>(
      this.endpoint,
      formData
    );
  }

  /**
   * Update a category
   * Uses FormData for file upload (PATCH with form-data)
   */
  async updateCategory(
    id: number,
    data: UpdateCategoryDto
  ): Promise<ApiResponse<Category>> {
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

    if (data.tags_en !== undefined) {
      formData.append("tags_en", JSON.stringify(data.tags_en));
    }

    if (data.tags_ar !== undefined) {
      formData.append("tags_ar", JSON.stringify(data.tags_ar));
    }
    
    if (data.visible !== undefined) {
      formData.append("visible", String(data.visible));
    }
    
    if (data.is_active !== undefined) {
      formData.append("is_active", String(data.is_active));
    }
    
    if (data.parent_id !== undefined) {
      formData.append("parent_id", data.parent_id === null ? "null" : String(data.parent_id));
    }
    
    if (data.image) {
      formData.append("image", data.image);
    }

    appendProductChangesField(formData, data.product_changes);

    if (data.attribute_ids !== undefined) {
      formData.append("attribute_ids", JSON.stringify(data.attribute_ids));
    }

    if (data.specification_ids !== undefined) {
      formData.append("specification_ids", JSON.stringify(data.specification_ids));
    }

    return httpClient.patchFormData<ApiResponse<Category>>(
      `${this.endpoint}/${id}`,
      formData
    );
  }

  /**
   * Reorder categories
   */
  async reorderCategories(data: ReorderCategoriesDto): Promise<ApiResponse<void>> {
    return httpClient.put<ApiResponse<void>>(`${this.endpoint}/reorder`, data);
  }

  /**
   * Archive a category (soft delete)
   */
  async archiveCategory(id: number): Promise<ApiResponse<void>> {
    return httpClient.post<ApiResponse<void>>(`${this.endpoint}/${id}/archive`);
  }

  /**
   * Restore an archived category
   */
  async restoreCategory(id: number, data?: RestoreCategoryDto): Promise<ApiResponse<CategoryRestoreResult>> {
    return httpClient.post<ApiResponse<CategoryRestoreResult>>(`${this.endpoint}/${id}/restore`, data);
  }

  /**
   * Get archived categories (trash view)
   * Now includes archivedProducts and archivedSubcategories for each category
   */
  async getArchivedCategories(): Promise<ApiResponse<Category[]>> {
    return httpClient.get<ApiResponse<Category[]>>(`${this.endpoint}/archive/list`);
  }

  /**
   * Permanently delete a category
   */
  async permanentDeleteCategory(id: number, data?: PermanentDeleteCategoryDto): Promise<ApiResponse<void>> {
    return httpClient.delete<ApiResponse<void>>(`${this.endpoint}/${id}/permanent`, data);
  }

  /**
   * Delete a category (legacy - now archives instead)
   * @deprecated Use archiveCategory instead
   */
  async deleteCategory(id: number): Promise<ApiResponse<void>> {
    return this.archiveCategory(id);
  }

  // ============================================
  // Category Products Management
  // ============================================

  /**
   * Get products in a category
   * Returns { category, products }
   */
  async getProducts(id: number): Promise<ApiResponse<{ category: Category; products: any[] }>> {
    return httpClient.get<ApiResponse<{ category: Category; products: any[] }>>(`${this.endpoint}/${id}/products`);
  }

  /**
   * Assign products to a category
   */
  async assignProducts(id: number, product_ids: number[]): Promise<ApiResponse<void>> {
    return httpClient.post<ApiResponse<void>>(`${this.endpoint}/${id}/products`, { product_ids });
  }

  /**
   * Remove products from a category
   */
  async removeProducts(id: number, product_ids: number[]): Promise<ApiResponse<void>> {
    return httpClient.delete<ApiResponse<void>>(`${this.endpoint}/${id}/products`, { product_ids });
  }
}

export const categoryService = new CategoryService();

