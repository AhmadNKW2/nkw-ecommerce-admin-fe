export type VendorSubmissionStatus =
  | "pending_ai"
  | "ai_processing"
  | "awaiting_brand"
  | "awaiting_category"
  | "awaiting_category_specs"
  | "awaiting_specs_approval"
  | "ready"
  | "materialized"
  | "rejected"
  | "failed";

export type AiMatchedValueId = number | "not_exist";

export interface Stage2Value {
  original_value: string | { name_en?: string; name_ar?: string } | unknown;
  matched_value_id: AiMatchedValueId;
}

export interface Stage2Specification {
  specification_id: number;
  values: Stage2Value[];
}

export interface Stage2Attribute {
  attribute: { attribute_id: number; original_value?: unknown };
  values: Stage2Value[];
}

export interface Stage2Result {
  title_en?: string;
  title_ar?: string;
  short_description_en?: string;
  short_description_ar?: string;
  description_en?: string;
  description_ar?: string;
  meta_title_en?: string;
  meta_title_ar?: string;
  specifications?: Stage2Specification[];
  attributes?: Stage2Attribute[];
  [key: string]: unknown;
}

export interface SubmissionMediaItem {
  id: number;
  submission_id: number;
  media_id: number;
  sort_order: number;
  is_primary: boolean;
  media?: {
    id: number;
    url: string;
    type: string;
  };
}

export interface VendorSubmission {
  id: number;
  vendor_id: number;
  created_by: number | null;
  title: string;
  description: string;
  price: number;
  sale_price: number | null;
  stock: number;
  status: VendorSubmissionStatus;
  ai_result: {
    stage1?: {
      brand_match: string | null;
      suggested_brand: { name_en: string; name_ar: string } | null;
      category_match: number | null;
      suggested_category: {
        name_en: string;
        name_ar: string;
        parent_id: number | null;
        reason?: string;
      } | null;
    };
    stage2?: Stage2Result;
  } | null;
  resolved_brand_id: number | null;
  resolved_category_id: number | null;
  brand_request_id: number | null;
  category_request_id: number | null;
  specs_request_id: number | null;
  product_id: number | null;
  error: string | null;
  media?: SubmissionMediaItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateVendorSubmissionInput {
  title: string;
  description: string;
  price: number;
  sale_price: number;
  stock: number;
  media?: { media_id: number; is_primary?: boolean; sort_order?: number }[];
}

export interface ListVendorSubmissionsParams {
  page?: number;
  limit?: number;
  status?: VendorSubmissionStatus;
  vendor_id?: number;
}

export type CatalogRequestType = "brand" | "category" | "specs";
export type CatalogRequestStatus = "pending" | "approved" | "rejected";

export interface CatalogRequest {
  id: number;
  type: CatalogRequestType;
  status: CatalogRequestStatus;
  submission_id: number | null;
  requested_by: number | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  payload: {
    mode?: "match" | "create" | "review";
    name_en?: string;
    name_ar?: string;
    parent_id?: number | null;
    matched_brand_id?: number | null;
    matched_category_id?: number | null;
    reason?: string | null;
    title_en?: string | null;
    title_ar?: string | null;
    specifications?: Stage2Specification[];
    attributes?: Stage2Attribute[];
    [key: string]: unknown;
  };
  result_entity_id: number | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListCatalogRequestsParams {
  page?: number;
  limit?: number;
  type?: CatalogRequestType;
  status?: CatalogRequestStatus;
}

export interface ApproveCatalogRequestInput {
  name_en?: string;
  name_ar?: string;
  parent_id?: number | null;
  existing_entity_id?: number | null;
  create_new?: boolean;
  admin_notes?: string;
}
