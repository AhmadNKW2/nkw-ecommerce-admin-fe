export interface GenerateCategoryTagsRequest {
  category_ids?: number[];
  max_tags_per_category?: number;
  max_product_names_per_category?: number;
  model?: string;
}

export interface StartCategoryTagsJobResponse {
  job_id: string;
  status: "running";
  started_at: string;
}

export interface CategoryTagsJobResult {
  processed_categories: number;
  updated_categories: number;
  failed_categories: number;
  updated: Array<{
    category_id: number;
    tags_en_count: number;
    tags_ar_count: number;
  }>;
  failed: Array<{
    category_id: number;
    error: string;
  }>;
}

export interface CategoryTagsJobStatusResponse {
  job_id: string;
  status: "running" | "done" | "failed";
  started_at: string;
  finished_at: string | null;
  progress: number;
  total: number;
  current_category_id: number | null;
  current_category_name_en: string | null;
  result: CategoryTagsJobResult | null;
  error: string | null;
  duration_seconds: number;
}
