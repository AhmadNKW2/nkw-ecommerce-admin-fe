"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth.context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSessionStoragePage } from "@/hooks/use-session-storage-page";
import { useResolvedFeatureToggles } from "@/hooks/use-resolved-feature-toggles";
import { isSimplifiedProductCreator } from "@/lib/simplified-product-creator";
import { useVendors } from "@/services/vendors/hooks/use-vendors";
import { useBrands } from "@/services/brands/hooks/use-brands";
import { useCategories } from "@/services/categories/hooks/use-categories";
import { useCustomers } from "@/services/customers/hooks/use-customers";
import type { ProductFilters, ProductStatus } from "@/services/products/types/product.types";
import {
  NO_BRAND_FILTER_VALUE,
  NO_CATEGORY_FILTER_VALUE,
  NO_VENDOR_FILTER_VALUE,
  WORKFLOW_STATUSES,
  normalizeStoredProductFilters,
} from "./product-filter-shared";

interface UseProductFiltersOptions {
  storageKey: string;
  fixedStatus?: ProductStatus;
  initialStatus?: ProductStatus;
  initialVisible?: boolean;
  onStatusCleared?: () => void;
}

export function useProductFilters({
  storageKey,
  fixedStatus,
  initialStatus,
  initialVisible,
  onStatusCleared,
}: UseProductFiltersOptions) {
  const { user } = useAuth();
  const isVendorPortalUser = isSimplifiedProductCreator(user);
  const lockedVendorId =
    isVendorPortalUser && user?.vendorId != null && Number(user.vendorId) > 0
      ? String(user.vendorId)
      : null;

  const { isEnabled, isResolved } = useResolvedFeatureToggles();
  const vendorsEnabled = isEnabled("vendors_enabled");
  const referenceLinksEnabled =
    isEnabled("reference_links_enabled") && !isVendorPortalUser;

  const {
    page: storedPage,
    setPage: setStoredPage,
    limit: storedLimit,
    setLimit: setStoredLimit,
  } = useSessionStoragePage(storageKey);
  const filtersStorageKey = `${storageKey}_filters`;

  const [queryParams, setQueryParams] = useState<ProductFilters>(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(filtersStorageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return normalizeStoredProductFilters(parsed, storedPage, storedLimit, fixedStatus);
        } catch {
          // Ignore parse errors.
        }
      }
    }

    return {
      page: storedPage,
      limit: storedLimit,
      status: fixedStatus ?? initialStatus,
      visible: initialVisible,
    };
  });

  const [searchTerm, setSearchTerm] = useState(queryParams.search || "");
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const isSearchDebouncing = searchTerm.trim() !== debouncedSearch.trim();
  const isAwaitingSearchResults =
    isSearchDebouncing && Boolean(searchTerm.trim()) && !debouncedSearch.trim();

  const productQueryParams = useMemo(() => {
    const search = debouncedSearch.trim() || undefined;
    const next: ProductFilters = {
      ...queryParams,
      search,
    };

    if (lockedVendorId) {
      next.vendor_ids = lockedVendorId;
      next.vendor_id = undefined;
      next.vendorId = undefined;
      next.has_no_vendor = undefined;
      next.status = undefined;
      next.has_duplicate_reference_link = undefined;
      next.created_by = undefined;
    }

    return next;
  }, [queryParams, debouncedSearch, lockedVendorId]);
  const [minPrice, setMinPrice] = useState(queryParams.minPrice?.toString() || "");
  const [maxPrice, setMaxPrice] = useState(queryParams.maxPrice?.toString() || "");
  const [startDate, setStartDate] = useState(queryParams.start_date || "");
  const [endDate, setEndDate] = useState(queryParams.end_date || "");
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([
    ...(queryParams.has_no_vendor ? [NO_VENDOR_FILTER_VALUE] : []),
    ...(queryParams.vendor_ids?.split(",") || []),
  ]);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([
    ...(queryParams.has_no_brand ? [NO_BRAND_FILTER_VALUE] : []),
    ...(queryParams.brand_ids?.split(",") || []),
  ]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    queryParams.categoryId === NO_CATEGORY_FILTER_VALUE
      ? [NO_CATEGORY_FILTER_VALUE]
      : queryParams.category_ids?.split(",") || []
  );
  const [selectedCreatedByIds, setSelectedCreatedByIds] = useState<string[]>(
    queryParams.created_by?.split(",") || []
  );

  const { data: vendorsData } = useVendors(undefined, {
    enabled: !isVendorPortalUser,
  });
  const { data: brandsData } = useBrands();
  const categoriesData = useCategories();
  const { data: adminsData } = useCustomers(
    {
      role: ["admin", "constant_token_admin", "catalog_manager"],
      limit: 100,
    } as any,
    { enabled: !isVendorPortalUser },
  );

  // Vendor/store portal users can only see their own vendor's products.
  useEffect(() => {
    if (!lockedVendorId) return;

    setSelectedVendorIds([lockedVendorId]);
    setQueryParams((prev) => {
      if (
        prev.vendor_ids === lockedVendorId &&
        !prev.vendor_id &&
        !prev.vendorId &&
        !prev.has_no_vendor
      ) {
        return prev;
      }

      return {
        ...prev,
        vendor_ids: lockedVendorId,
        vendor_id: undefined,
        vendorId: undefined,
        has_no_vendor: undefined,
        page: 1,
      };
    });
  }, [lockedVendorId]);

  useEffect(() => {
    if (!fixedStatus && initialStatus) {
      setQueryParams((prev) =>
        prev.status === initialStatus ? prev : { ...prev, status: initialStatus, page: 1 }
      );
    }
  }, [fixedStatus, initialStatus]);

  useEffect(() => {
    if (initialVisible !== undefined) {
      setQueryParams((prev) =>
        prev.visible === initialVisible ? prev : { ...prev, visible: initialVisible, page: 1 }
      );
    }
  }, [initialVisible]);

  useEffect(() => {
    setStoredPage(queryParams.page ?? 1);
  }, [queryParams.page, setStoredPage]);

  useEffect(() => {
    if (queryParams.limit) {
      setStoredLimit(queryParams.limit);
    }
  }, [queryParams.limit, setStoredLimit]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const { page, limit, status, ...filtersToStore } = queryParams;
      const payload = fixedStatus ? filtersToStore : { ...filtersToStore, status };
      sessionStorage.setItem(filtersStorageKey, JSON.stringify(payload));
    }
  }, [filtersStorageKey, fixedStatus, queryParams]);

  useEffect(() => {
    if (!isResolved) {
      return;
    }

    // Never clear the locked vendor scope for portal users.
    if (!vendorsEnabled && !lockedVendorId) {
      setSelectedVendorIds((current) => (current.length > 0 ? [] : current));
      setQueryParams((prev) => {
        if (
          !prev.vendor_ids &&
          !prev.vendor_id &&
          !prev.vendorId &&
          !prev.has_no_vendor
        ) {
          return prev;
        }

        const next = { ...prev };
        delete next.vendor_ids;
        delete next.vendor_id;
        delete next.vendorId;
        delete next.has_no_vendor;
        return { ...next, page: 1 };
      });
    }

    if (!referenceLinksEnabled) {
      setQueryParams((prev) => {
        if (prev.has_duplicate_reference_link === undefined) {
          return prev;
        }

        const next = { ...prev };
        delete next.has_duplicate_reference_link;
        return { ...next, page: 1 };
      });
    }

    if (isVendorPortalUser) {
      setSelectedCreatedByIds((current) => (current.length > 0 ? [] : current));
      setQueryParams((prev) => {
        if (
          prev.status === undefined &&
          prev.created_by === undefined &&
          prev.has_duplicate_reference_link === undefined
        ) {
          return prev;
        }

        const next = { ...prev };
        delete next.status;
        delete next.created_by;
        delete next.has_duplicate_reference_link;
        return { ...next, page: 1 };
      });
    }
  }, [isResolved, vendorsEnabled, referenceLinksEnabled, lockedVendorId, isVendorPortalUser]);

  const handleFilterChange = (filters: ProductFilters) => {
    setQueryParams((prev) => {
      const next = {
        ...prev,
        ...filters,
        page: 1,
      };

      if (fixedStatus) {
        next.status = fixedStatus;
      } else if ("status" in filters) {
        next.status = filters.status;
      }

      return next;
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value.slice(0, 150));
  };

  useEffect(() => {
    const nextSearch = debouncedSearch.trim() || undefined;
    setQueryParams((prev) => {
      if ((prev.search || "") === (nextSearch || "")) {
        return prev;
      }

      return {
        ...prev,
        search: nextSearch,
        page: 1,
      };
    });
  }, [debouncedSearch]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      const numMin = minPrice ? Number(minPrice) : undefined;
      const numMax = maxPrice ? Number(maxPrice) : undefined;

      if (numMin !== queryParams.minPrice || numMax !== queryParams.maxPrice) {
        setQueryParams((prev) => ({
          ...prev,
          minPrice: numMin,
          maxPrice: numMax,
          page: 1,
        }));
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [maxPrice, minPrice, queryParams.maxPrice, queryParams.minPrice]);

  const handleDateChange = (field: "start_date" | "end_date", value: string) => {
    if (field === "start_date") {
      setStartDate(value);
    } else {
      setEndDate(value);
    }

    handleFilterChange({ [field]: value || undefined });
  };

  const handleVendorChange = (value: string | string[]) => {
    if (lockedVendorId) {
      setSelectedVendorIds([lockedVendorId]);
      handleFilterChange({
        vendor_id: undefined,
        vendorId: undefined,
        vendor_ids: lockedVendorId,
        has_no_vendor: undefined,
      });
      return;
    }

    const normalized = Array.from(new Set(Array.isArray(value) ? value : [value].filter(Boolean)));
    const hasNoVendor = normalized.includes(NO_VENDOR_FILTER_VALUE);
    const vendorIds = normalized.filter((id) => id !== NO_VENDOR_FILTER_VALUE);
    setSelectedVendorIds(normalized);
    handleFilterChange({
      vendor_id: undefined,
      vendorId: undefined,
      vendor_ids: vendorIds.length > 0 ? vendorIds.join(",") : undefined,
      has_no_vendor: hasNoVendor || undefined,
    });
  };

  const handleBrandChange = (value: string | string[]) => {
    const normalized = Array.from(new Set(Array.isArray(value) ? value : [value].filter(Boolean)));
    const hasNoBrand = normalized.includes(NO_BRAND_FILTER_VALUE);
    const brandIds = normalized.filter((id) => id !== NO_BRAND_FILTER_VALUE);
    setSelectedBrandIds(normalized);
    handleFilterChange({
      brandId: undefined,
      brand_ids: brandIds.length > 0 ? brandIds.join(",") : undefined,
      has_no_brand: hasNoBrand || undefined,
    });
  };

  const handleCategoryChange = (ids: string[]) => {
    const normalizedIds = Array.from(new Set(ids.filter(Boolean)));
    const hasNoCategory = normalizedIds.includes(NO_CATEGORY_FILTER_VALUE);
    const categoryIds = normalizedIds.filter((id) => id !== NO_CATEGORY_FILTER_VALUE);

    if (hasNoCategory && categoryIds.length === 0) {
      setSelectedCategoryIds([NO_CATEGORY_FILTER_VALUE]);
      handleFilterChange({ categoryId: NO_CATEGORY_FILTER_VALUE, category_ids: undefined });
      return;
    }

    setSelectedCategoryIds(categoryIds);
    handleFilterChange({
      categoryId: undefined,
      category_ids: categoryIds.length > 0 ? categoryIds.join(",") : undefined,
    });
  };

  const handleCreatedByChange = (value: string | string[]) => {
    const normalized = Array.isArray(value) ? value : [value].filter(Boolean);
    setSelectedCreatedByIds(normalized);
    handleFilterChange({ created_by: normalized.length > 0 ? normalized.join(",") : undefined });
  };

  const handleStockChange = (value: string | string[]) => {
    const normalized = Array.isArray(value) ? value[0] : value;
    let inStock = undefined;
    if (normalized === "true") {
      inStock = true;
    } else if (normalized === "false") {
      inStock = false;
    }
    handleFilterChange({ in_stock: inStock });
  };

  const handleVisibilityChange = (value: string | string[]) => {
    const normalized = Array.isArray(value) ? value[0] : value;
    let visible = undefined;
    if (normalized === "true") {
      visible = true;
    } else if (normalized === "false") {
      visible = false;
    }
    handleFilterChange({ visible });
  };

  const handleDuplicateReferenceLinkChange = (value: string | string[]) => {
    const normalized = Array.isArray(value) ? value[0] : value;
    let hasDuplicateReferenceLink = undefined;
    if (normalized === "true") {
      hasDuplicateReferenceLink = true;
    } else if (normalized === "false") {
      hasDuplicateReferenceLink = false;
    }
    handleFilterChange({ has_duplicate_reference_link: hasDuplicateReferenceLink });
  };

  const handleStatusFilterChange = (value: string | string[]) => {
    const normalized = Array.isArray(value) ? value[0] : value;
    const status =
      normalized && WORKFLOW_STATUSES.includes(normalized as ProductStatus)
        ? (normalized as ProductStatus)
        : undefined;
    handleFilterChange({ status });
    if (!status) {
      onStatusCleared?.();
    }
  };

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setMinPrice("");
    setMaxPrice("");
    setStartDate("");
    setEndDate("");
    setSelectedVendorIds(lockedVendorId ? [lockedVendorId] : []);
    setSelectedBrandIds([]);
    setSelectedCategoryIds([]);
    setSelectedCreatedByIds([]);
    setQueryParams({
      page: 1,
      limit: storedLimit,
      status: isVendorPortalUser ? undefined : fixedStatus,
      ...(lockedVendorId
        ? {
            vendor_ids: lockedVendorId,
            vendor_id: undefined,
            vendorId: undefined,
            has_no_vendor: undefined,
          }
        : {}),
    });
  };

  const hasActiveFilters = Object.keys(queryParams).some((key) => {
    if (key === "page" || key === "limit") {
      return false;
    }
    if (fixedStatus && key === "status") {
      return false;
    }
    // Locked vendor scope is always on for portal users — not an "active" filter.
    if (
      lockedVendorId &&
      (key === "vendor_ids" || key === "vendor_id" || key === "vendorId")
    ) {
      return false;
    }
    return queryParams[key as keyof ProductFilters] !== undefined;
  });

  const vendorOptions = useMemo(
    () => [
      { value: NO_VENDOR_FILTER_VALUE, label: "No Vendor" },
      ...(vendorsData?.data ?? []).map((vendor: any) => ({
        value: String(vendor.id),
        label: vendor.name_en || vendor.name || String(vendor.id),
      })),
    ],
    [vendorsData?.data]
  );

  const brandOptions = useMemo(
    () => [
      { value: NO_BRAND_FILTER_VALUE, label: "No Brand" },
      ...(brandsData?.data ?? []).map((brand: any) => ({
        value: String(brand.id),
        label: brand.name_en || brand.name || String(brand.id),
      })),
    ],
    [brandsData?.data]
  );

  const categoryOptions = useMemo(
    () =>
      (categoriesData.data ?? []).map((category: any) => ({
        value: String(category.id),
        label: category.name_en || category.name || String(category.id),
      })),
    [categoriesData.data]
  );

  const adminOptions = useMemo(
    () =>
      (adminsData?.data ?? []).map((admin: any) => ({
        value: String(admin.id),
        label:
          [admin.firstName, admin.lastName].filter(Boolean).join(" ") ||
          admin.email ||
          String(admin.id),
      })),
    [adminsData?.data]
  );

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;

  return {
    queryParams,
    productQueryParams,
    isSearchDebouncing,
    isAwaitingSearchResults,
    setQueryParams,
    searchTerm,
    minPrice,
    maxPrice,
    startDate,
    endDate,
    selectedVendorIds,
    selectedBrandIds,
    selectedCategoryIds,
    selectedCreatedByIds,
    vendorsEnabled: vendorsEnabled && !isVendorPortalUser,
    createdByFilterEnabled: !isVendorPortalUser,
    referenceLinksEnabled,
    vendorOptions,
    brandOptions,
    categoryOptions,
    adminOptions,
    categoriesData,
    hasActiveFilters,
    todayStr,
    storedLimit,
    isVendorPortalUser,
    lockedVendorId,
    handleSearchChange,
    setMinPrice,
    setMaxPrice,
    handleDateChange,
    handleVendorChange,
    handleBrandChange,
    handleCategoryChange,
    handleCreatedByChange,
    handleStockChange,
    handleVisibilityChange,
    handleDuplicateReferenceLinkChange,
    handleStatusFilterChange,
    handleClearAllFilters,
    handlePageChange: (page: number) => setQueryParams((prev) => ({ ...prev, page })),
    handlePageSizeChange: (pageSize: number) =>
      setQueryParams((prev) => ({ ...prev, limit: pageSize, page: 1 })),
  };
}
