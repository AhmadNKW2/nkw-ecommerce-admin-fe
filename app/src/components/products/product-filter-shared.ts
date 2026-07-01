import type { ProductStatus, ProductFilters } from "@/services/products/types/product.types";

export const WORKFLOW_STATUSES: ProductStatus[] = ["active", "review", "updated"];

export const NO_CATEGORY_FILTER_VALUE = "none";
export const NO_VENDOR_FILTER_VALUE = "__no_vendor__";
export const NO_BRAND_FILTER_VALUE = "__no_brand__";

export const normalizeStoredFilterId = (value: unknown) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : undefined;
};

export const normalizeStoredMultiFilter = (
  multiValue: unknown,
  ...singleValues: unknown[]
) => {
  if (typeof multiValue === "string" && multiValue.trim()) {
    return multiValue;
  }

  if (Array.isArray(multiValue)) {
    const values = multiValue
      .map((value) => normalizeStoredFilterId(value))
      .filter((value): value is string => Boolean(value));

    if (values.length > 0) {
      return values.join(",");
    }
  }

  for (const singleValue of singleValues) {
    const normalized = normalizeStoredFilterId(singleValue);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
};

export const normalizeStoredProductFilters = (
  rawFilters: unknown,
  storedPage: number,
  storedLimit: number,
  fixedStatus?: ProductStatus
): ProductFilters => {
  if (!rawFilters || typeof rawFilters !== "object") {
    return {
      page: storedPage,
      limit: storedLimit,
      status: fixedStatus,
    };
  }

  const parsed = rawFilters as ProductFilters;

  return {
    ...parsed,
    page: storedPage,
    limit: storedLimit,
    status: fixedStatus ?? parsed.status,
    vendor_ids: normalizeStoredMultiFilter(
      parsed.vendor_ids,
      parsed.vendor_id,
      parsed.vendorId
    ),
    vendor_id: undefined,
    vendorId: undefined,
    brand_ids: normalizeStoredMultiFilter(parsed.brand_ids, parsed.brandId),
    brandId: undefined,
  };
};

export const getStatusLabel = (status?: ProductStatus) => {
  if (!status) {
    return "—";
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const getStatusVariant = (
  status?: ProductStatus
): "default" | "success" | "danger" | "default2" | "warning" => {
  if (status === "active") {
    return "success";
  }
  if (status === "review") {
    return "warning";
  }
  if (status === "updated") {
    return "default2";
  }
  return "default";
};
