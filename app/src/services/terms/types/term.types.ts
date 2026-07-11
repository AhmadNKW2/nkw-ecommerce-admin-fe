export interface GenerateTermsRequest {
  category_ids?: number[];
  model?: string;
}

export interface StartTermsJobResponse {
  job_id: string;
  status: "running";
  started_at: string;
}

export interface TermsJobResult {
  processed_products: number;
  detected_concepts: number;
  updated_groups: number;
  failed_concepts: number;
  updated: Array<{
    concept_key: string;
    concept_label_en: string;
    concept_label_ar: string;
    terms_en_count: number;
    terms_ar_count: number;
  }>;
  failed: Array<{
    concept_key: string;
    error: string;
  }>;
}

export interface TermsJobStatusResponse {
  job_id: string;
  status: "running" | "paused" | "done" | "failed" | "cancelled";
  started_at: string;
  finished_at: string | null;
  progress: number;
  total: number;
  current_concept_key: string | null;
  current_concept_label_en: string | null;
  result: TermsJobResult | null;
  error: string | null;
  duration_seconds: number;
}

export interface CancelTermsJobResponse {
  job_id: string;
  status: "running" | "paused" | "done" | "failed" | "cancelled";
  message: string;
}

export interface PauseResumeTermsJobResponse {
  job_id: string;
  status: "running" | "paused" | "done" | "failed" | "cancelled";
  message: string;
}

export interface ClearConceptsResponse {
  message: string;
}

export interface TermGroupItem {
  group_id: number;
  concept_key: string | null;
  concept_label_en: string | null;
  concept_label_ar: string | null;
  terms_en: string[];
  terms_ar: string[];
  reference_product_ids: number[];
}

export interface TermGroupsListResponse {
  items: TermGroupItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ConceptCoverageResponse {
  total_products: number;
  concept_groups: number;
  referenced_products: number;
  unreferenced_products: number;
  sample_unreferenced: Array<{ id: number; name_en: string | null }>;
}

export interface CreateTermGroupRequest {
  concept_key: string;
  concept_label_en?: string;
  concept_label_ar?: string;
  terms_en?: string[];
  terms_ar?: string[];
  reference_product_ids?: number[];
}

export type UpdateTermGroupRequest = Partial<CreateTermGroupRequest>;

export interface DeleteTermGroupResponse {
  message: string;
  group_id: number;
}
