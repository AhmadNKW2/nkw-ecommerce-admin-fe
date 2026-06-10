"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/hooks/use-loading-router";
import { useSessionStoragePage } from "@/hooks/use-session-storage-page";
import { useLoading } from "@/providers/loading-provider";
import {
  useDeleteProduct,
  usePermanentDeleteProduct,
  useProducts,
  useToggleProductStatus,
} from "@/services/products/hooks/use-products";
import {
  Product,
  ProductFilters,
  ProductStatus,
} from "@/services/products/types/product.types";
import { useVendors } from "@/services/vendors/hooks/use-vendors";
import { useBrands } from "@/services/brands/hooks/use-brands";
import { useCategories } from "@/services/categories/hooks/use-categories";
import { useCustomers } from "@/services/customers/hooks/use-customers";
import { STOREFRONT_CONFIG } from "@/lib/constants";
import { Package, AlertCircle, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { DatePicker } from "@/components/ui/date-picker";
import { CategoryTreeSelect } from "@/components/products/CategoryTreeSelect";
import { Select } from "@/components/ui/select";

interface ProductListPageProps {
  title: string;
  description: string;
  storageKey: string;
  fixedStatus?: ProductStatus;
}

const NO_CATEGORY_FILTER_VALUE = "none";
const NO_VENDOR_FILTER_VALUE = "__no_vendor__";
const NO_BRAND_FILTER_VALUE = "__no_brand__";

const normalizeStoredFilterId = (value: unknown) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : undefined;
};

const normalizeStoredMultiFilter = (multiValue: unknown, ...singleValues: unknown[]) => {
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

const normalizeStoredProductFilters = (
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

const formatPriceValue = (value: number) => {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const toPriceCandidate = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return {
    raw: formatPriceValue(numericValue),
    numericValue,
  };
};

const getProductImageUrl = (product: Product) => {
  if (product.primary_image?.url) {
    return product.primary_image.url;
  }

  if (typeof product.image === "string" && product.image.trim()) {
    return product.image;
  }

  const directMedia = Array.isArray(product.media) ? product.media : [];
  const primaryDirectMedia = directMedia.find((mediaItem: any) => mediaItem?.is_primary && mediaItem?.url);
  if (primaryDirectMedia?.url) {
    return primaryDirectMedia.url;
  }

  const firstDirectMedia = [...directMedia]
    .sort((left: any, right: any) => (left?.sort_order ?? 0) - (right?.sort_order ?? 0))
    .find((mediaItem: any) => mediaItem?.url);
  if (firstDirectMedia?.url) {
    return firstDirectMedia.url;
  }

  if (product.media_groups) {
    for (const key in product.media_groups) {
      const group = product.media_groups[key];
      if (group?.media?.length) {
        const primaryMedia = group.media.find((mediaItem: any) => mediaItem.is_primary);
        if (primaryMedia?.url) {
          return primaryMedia.url;
        }
      }
    }
  }

  if (product.variants?.length && product.media_groups) {
    const firstVariant = product.variants[0];
    if (product.media_groups[firstVariant.media_group_id]?.media?.length) {
      return product.media_groups[firstVariant.media_group_id].media[0].url;
    }
  }

  if (product.media_groups) {
    const firstGroup = product.media_groups[Object.keys(product.media_groups)[0]];
    if (firstGroup?.media?.length) {
      return firstGroup.media[0].url;
    }
  }

  return null;
};

const getProductDisplayPrice = (product: Product) => {
  let basePrice = null;
  let salePrice = null;

  if (product.variants?.length && product.price_groups) {
    const firstVariant = product.variants[0];
    const priceGroup = product.price_groups[firstVariant.price_group_id];
    if (priceGroup) {
      basePrice = toPriceCandidate(priceGroup.price);
      salePrice = toPriceCandidate(priceGroup.sale_price);
    }
  } else if (product.price_groups) {
    const firstGroup = product.price_groups[Object.keys(product.price_groups)[0]];
    if (firstGroup) {
      basePrice = toPriceCandidate(firstGroup.price);
      salePrice = toPriceCandidate(firstGroup.sale_price);
    }
  } else if (product.price) {
    const legacyPrice = product.price as any;
    if (typeof legacyPrice === "object") {
      basePrice = toPriceCandidate(legacyPrice.price);
      salePrice = toPriceCandidate(legacyPrice.sale_price);
    } else {
      basePrice = toPriceCandidate(legacyPrice);
      salePrice = toPriceCandidate(product.sale_price);
    }
  } else {
    salePrice = toPriceCandidate(product.sale_price);
  }

  if (basePrice && salePrice && basePrice.numericValue !== salePrice.numericValue) {
    const currentPrice = basePrice.numericValue <= salePrice.numericValue ? basePrice : salePrice;
    const compareAtPrice = basePrice.numericValue <= salePrice.numericValue ? salePrice : basePrice;

    return {
      currentPrice: currentPrice.raw,
      compareAtPrice: compareAtPrice.raw,
    };
  }

  const currentPrice = basePrice || salePrice;
  if (!currentPrice) {
    return null;
  }

  return {
    currentPrice: currentPrice.raw,
    compareAtPrice: null,
  };
};

export function ProductListPage({
  title,
  description,
  storageKey,
  fixedStatus,
}: ProductListPageProps) {
  const router = useRouter();
  const { setShowOverlay } = useLoading();
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
          return normalizeStoredProductFilters(
            parsed,
            storedPage,
            storedLimit,
            fixedStatus
          );
        } catch {
          // Ignore parse errors.
        }
      }
    }

    return {
      page: storedPage,
      limit: storedLimit,
      status: fixedStatus,
    };
  });

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

  const [searchTerm, setSearchTerm] = useState(queryParams.search || "");
  const [minPrice, setMinPrice] = useState(queryParams.minPrice?.toString() || "");
  const [maxPrice, setMaxPrice] = useState(queryParams.maxPrice?.toString() || "");
  const [startDate, setStartDate] = useState(queryParams.start_date || "");
  const [endDate, setEndDate] = useState(queryParams.end_date || "");
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>(
    [
      ...(queryParams.has_no_vendor ? [NO_VENDOR_FILTER_VALUE] : []),
      ...(queryParams.vendor_ids?.split(",") || []),
    ]
  );
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>(
    [
      ...(queryParams.has_no_brand ? [NO_BRAND_FILTER_VALUE] : []),
      ...(queryParams.brand_ids?.split(",") || []),
    ]
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    queryParams.categoryId === NO_CATEGORY_FILTER_VALUE
      ? [NO_CATEGORY_FILTER_VALUE]
      : queryParams.category_ids?.split(",") || []
  );
  const [selectedCreatedByIds, setSelectedCreatedByIds] = useState<string[]>(
    queryParams.created_by?.split(",") || []
  );
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const isPermanentDeleteMode = fixedStatus === "review";

  const { data, isLoading, isError, error, refetch } = useProducts(queryParams);
  const archiveProduct = useDeleteProduct();
  const permanentDeleteProduct = usePermanentDeleteProduct();
  const deleteProduct = isPermanentDeleteMode ? permanentDeleteProduct : archiveProduct;
  const toggleProductStatus = useToggleProductStatus();

  const handleToggleVisibility = async (event: React.MouseEvent, product: Product) => {
    event.stopPropagation();
    try {
      await toggleProductStatus.mutateAsync({
        id: product.id,
        visible: !(product.visible ?? product.is_active),
      });
    } catch (err) {
      console.error("Failed to update visibility", err);
    }
  };

  const { data: vendorsData } = useVendors();
  const { data: brandsData } = useBrands();
  const categoriesData = useCategories();
  const { data: adminsData } = useCustomers({ role: ["admin", "constant_token_admin", "catalog_manager"], limit: 100 } as any);

  const vendorOptions = [
    { value: NO_VENDOR_FILTER_VALUE, label: "No Vendor" },
    ...(vendorsData?.data ?? []).map((vendor: any) => ({
      value: String(vendor.id),
      label: vendor.name_en || vendor.name || String(vendor.id),
    })),
  ];
  const brandOptions = [
    { value: NO_BRAND_FILTER_VALUE, label: "No Brand" },
    ...(brandsData?.data ?? []).map((brand: any) => ({
      value: String(brand.id),
      label: brand.name_en || brand.name || String(brand.id),
    })),
  ];
  const categoryOptions = (categoriesData.data ?? []).map((category: any) => ({
    value: String(category.id),
    label: category.name_en || category.name || String(category.id),
  }));
  const adminOptions = (adminsData?.data ?? []).map((admin: any) => ({
    value: String(admin.id),
    label:
      [admin.firstName, admin.lastName].filter(Boolean).join(" ") ||
      admin.email ||
      String(admin.id),
  }));

  const products = data?.data.data || [];

  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  useEffect(() => {
    if (!isLoading && products.length > 0) {
      const id = sessionStorage.getItem("highlighted_product_id");
      if (id) {
        setHighlightedProductId(id);

        setTimeout(() => {
          const element = document.getElementById(`product-row-${id}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            sessionStorage.removeItem("highlighted_product_id");
          }
        }, 300);
      }
    }
  }, [isLoading, products.length]);

  const handleFilterChange = (filters: ProductFilters) => {
    setQueryParams((prev) => ({
      ...prev,
      ...filters,
      status: fixedStatus ?? prev.status,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setQueryParams((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setQueryParams((prev) => ({ ...prev, limit: pageSize, page: 1 }));
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (productToDelete) {
      try {
        await deleteProduct.mutateAsync(productToDelete.id);
        setDeleteModalOpen(false);
        setProductToDelete(null);
      } catch (deleteError) {
        console.error("Failed to delete product:", deleteError);
      }
    }
  };

  const handlePreview = (slug?: string | null) => {
    if (!slug) {
      return;
    }

    window.open(
      `${STOREFRONT_CONFIG.baseUrl}/products/${slug}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleCreateNew = () => {
    router.push("/products/create");
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value.slice(0, 150));
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchTerm !== (queryParams.search || "")) {
        setQueryParams((prev) => ({
          ...prev,
          search: searchTerm || undefined,
          page: 1,
        }));
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [queryParams.search, searchTerm]);

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

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setMinPrice("");
    setMaxPrice("");
    setStartDate("");
    setEndDate("");
    setSelectedVendorIds([]);
    setSelectedBrandIds([]);
    setSelectedCategoryIds([]);
    setSelectedCreatedByIds([]);
    setQueryParams({ page: 1, limit: storedLimit, status: fixedStatus });
  };

  const hasActiveFilters = Object.keys(queryParams).some((key) => {
    if (key === "page" || key === "limit") {
      return false;
    }
    if (fixedStatus && key === "status") {
      return false;
    }
    return queryParams[key as keyof ProductFilters] !== undefined;
  });

  const getVisibilityVariant = (visible?: boolean): "default" | "success" | "danger" => {
    if (visible) {
      return "success";
    }
    return "danger";
  };

  const getVisibilityLabel = (visible?: boolean) => {
    return visible ? "Visible" : "Hidden";
  };

  const formatCategoryName = (name: string | undefined) => {
    if (!name) {
      return "";
    }
    const words = name.trim().split(/\s+/);
    if (words.length <= 1) {
      return name;
    }
    return `${words[0]} ${words[1].slice(0, 3)}...`;
  };

  const formatRating = (rating?: number | string | null) => {
    if (!rating) {
      return "0.0";
    }
    const numRating = typeof rating === "number" ? rating : parseFloat(rating);
    return numRating.toFixed(1);
  };

  const getCreatedAtParts = (createdAt?: string | Date) => {
    if (!createdAt) {
      return null;
    }

    if (typeof createdAt === "string") {
      const isoMatch = createdAt.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
      );

      if (isoMatch) {
        const [, year, month, day, hour, minute, second = "0"] = isoMatch;
        const localWallClockDate = new Date(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hour),
          Number(minute),
          Number(second)
        );

        return {
          date: localWallClockDate.toLocaleDateString(),
          time: localWallClockDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      }
    }

    const parsedDate = new Date(createdAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return {
      date: parsedDate.toLocaleDateString(),
      time: parsedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };

  if (isError) {
    return (
      <div className="min-h-screen bg-bw2 p-8">
        <div className="mx-auto">
          <Card>
            <div className="p-12 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-danger/10 p-3">
                  <AlertCircle className="h-8 w-8 text-danger" />
                </div>
              </div>
              <h3 className="text-xl font-bold ">Error Loading Products</h3>
              <p className=" max-w-md mx-auto">{error.message}</p>
              <Button onClick={() => refetch()}>Try Again</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;

  return (
    <div className="flex flex-col justify-center items-center gap-5 p-5">
      <PageHeader
        icon={<Package />}
        title={title}
        description={description}
        action={{ label: "Create", onClick: handleCreateNew }}
      />

      {(products.length > 0 || hasActiveFilters) && (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold ">Filters</h2>
            {hasActiveFilters && (
              <button
                onClick={handleClearAllFilters}
                className="text-sm text-danger hover:text-danger2"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <Input
              value={searchTerm}
              onChange={(event) => handleSearchChange(event.target.value)}
              label="Search"
              variant="search"
              maxLength={150}
            />

            <div className="flex items-center gap-4">
              <div className="relative flex-1 z-50">
                <CategoryTreeSelect
                  categories={categoriesData.data ?? []}
                  selectedIds={selectedCategoryIds}
                  onChange={handleCategoryChange}
                  exclusiveOption={{ value: NO_CATEGORY_FILTER_VALUE, label: "No Category" }}
                  singleSelect={false}
                  label="Category"
                  disabled={categoryOptions.length === 0}
                />
              </div>

              <div className="relative flex-1">
                <Select
                  label="Vendor"
                  value={selectedVendorIds}
                  onChange={handleVendorChange}
                  options={vendorOptions}
                  search={vendorOptions.length > 6}
                  multiple={true}
                  placeholder="All Vendors"
                  disabled={vendorOptions.length === 0}
                />
              </div>

              <div className="relative flex-1">
                <Select
                  label="Brand"
                  value={selectedBrandIds}
                  onChange={handleBrandChange}
                  options={brandOptions}
                  search={brandOptions.length > 6}
                  multiple={true}
                  placeholder="All Brands"
                  disabled={brandOptions.length === 0}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <DatePicker
                  label="Create Start Date"
                  value={startDate}
                  onChange={(value) => handleDateChange("start_date", value)}
                  max={endDate || todayStr}
                />
              </div>

              <div className="relative flex-1">
                <DatePicker
                  label="Create End Date"
                  value={endDate}
                  onChange={(value) => handleDateChange("end_date", value)}
                  min={startDate || undefined}
                  max={todayStr}
                />
              </div>

              <div className="relative flex-1">
                <Select
                  label="Created By"
                  value={selectedCreatedByIds}
                  onChange={handleCreatedByChange}
                  options={adminOptions}
                  search={adminOptions.length > 6}
                  multiple={true}
                  placeholder="All Admins"
                  disabled={adminOptions.length === 0}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Select
                  label="Stock"
                  value={
                    queryParams.in_stock === true
                      ? "true"
                      : queryParams.in_stock === false
                        ? "false"
                        : ""
                  }
                  onChange={handleStockChange}
                  options={[
                    { value: "true", label: "In Stock" },
                    { value: "false", label: "Out of Stock" },
                  ]}
                  onClear={() => handleStockChange("")}
                  multiple={false}
                  placeholder="All Stock Status"
                />
              </div>
              <div className="relative flex-1">
                <Select
                  label="Visibility"
                  value={
                    queryParams.visible === true
                      ? "true"
                      : queryParams.visible === false
                        ? "false"
                        : ""
                  }
                  onChange={handleVisibilityChange}
                  options={[
                    { value: "true", label: "Visible" },
                    { value: "false", label: "Hidden" },
                  ]}
                  onClear={() => handleVisibilityChange("")}
                  multiple={false}
                  placeholder="All Visibility"
                />
              </div>
              <div className="relative flex-1">
                <Select
                  label="Reference Links"
                  value={
                    queryParams.has_duplicate_reference_link === true
                      ? "true"
                      : queryParams.has_duplicate_reference_link === false
                        ? "false"
                        : ""
                  }
                  onChange={handleDuplicateReferenceLinkChange}
                  options={[
                    { value: "true", label: "Duplicated Reference Links" },
                    { value: "false", label: "No Duplicated Reference Links" },
                  ]}
                  onClear={() => handleDuplicateReferenceLinkChange("")}
                  multiple={false}
                  placeholder="All Reference Links"
                />
              </div>
              <div className="relative flex-1">
                <Input
                  label="Min Price"
                  type="number"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                  placeholder="0.00"
                  min={0}
                />
              </div>
              <div className="relative flex-1">
                <Input
                  label="Max Price"
                  type="number"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  placeholder="0.00"
                  min={0}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {!isLoading && products.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title="No products found"
          description={
            fixedStatus
              ? `No products with status \"${fixedStatus}\" were found`
              : "Try adjusting your filters or add new products"
          }
        />
      ) : !isLoading && (
        <Table
          pagination={
            data?.data.pagination
              ? {
                  currentPage: data.data.pagination.page,
                  pageSize: data.data.pagination.limit,
                  totalItems: data.data.pagination.total,
                  totalPages: data.data.pagination.totalPages,
                  hasNextPage: data.data.pagination.page < data.data.pagination.totalPages,
                  hasPreviousPage: data.data.pagination.page > 1,
                }
              : undefined
          }
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        >
          <TableHeader>
            <TableRow isHeader>
              <TableHead width="4%">#</TableHead>
              <TableHead width="6%">Image</TableHead>
              <TableHead width="11%">Product Name</TableHead>
              <TableHead width="8%">Category</TableHead>
              <TableHead width="11%">Brand</TableHead>
              <TableHead width="11%">Vendor</TableHead>
              <TableHead width="5%">Price</TableHead>
              <TableHead width="7%">Stock</TableHead>
              <TableHead width="5%">Rating</TableHead>
              <TableHead width="7%">Created At</TableHead>
              <TableHead width="10%">Created By</TableHead>
              <TableHead width="7%">Visibility</TableHead>
              <TableHead width="8%">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const imageUrl = getProductImageUrl(product);
              const displayPrice = getProductDisplayPrice(product);

              return (
                <TableRow
                  key={product.id}
                  id={`product-row-${product.id}`}
                  className={
                    highlightedProductId === product.id.toString()
                      ? "bg-secondary/10 transition-colors duration-500"
                      : ""
                  }
                >
                  <TableCell className="font-mono text-sm">{product.id}</TableCell>
                  <TableCell>
                    <div className="w-20 h-20 relative rounded-lg overflow-hidden bg-primary/10 border border-primary/20">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={product.name_en || ""}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="flex flex-col">
                      <span className="truncate" title={product.name_en}>
                        {product.name_en}
                      </span>
                      <span className="text-sm text-gray-500 truncate" title={product.name_ar}>
                        {product.name_ar}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.categories && product.categories.length > 0 ? (
                      <span title={product.categories[0].name_en} className="block max-w-22.5">
                        <Badge
                          variant="default2"
                          className="w-full whitespace-nowrap overflow-hidden text-ellipsis block"
                        >
                          {formatCategoryName(product.categories[0].name_en)}
                        </Badge>
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.brand?.name_en || product.brand?.logo ? (
                      <div className="flex items-center gap-2">
                        {product.brand?.logo && (
                          <div className="w-15 h-15 relative overflow-hidden border border-primary/20 rounded-lg">
                            <Image
                              src={product.brand.logo}
                              alt={product.brand.name_en || ""}
                              fill
                              className="object-contain"
                            />
                          </div>
                        )}
                        <span className="text-sm">
                          {product.brand?.name_en || <span className="text-gray-400">—</span>}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {product.vendor?.logo && (
                        <div className="w-15 h-15 relative overflow-hidden border border-primary/20 rounded-lg">
                          <Image
                            src={product.vendor.logo}
                            alt={product.vendor.name_en || ""}
                            fill
                            className="object-contain"
                          />
                        </div>
                      )}
                      <span className="text-sm">
                        {product.vendor?.name_en || product.vendor?.name || (
                          <span className="text-gray-400">—</span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {!displayPrice ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-semibold">{displayPrice.currentPrice}</span>
                        {displayPrice.compareAtPrice ? (
                          <span className="text-xs text-gray-500 line-through">
                            {displayPrice.compareAtPrice}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const isOutOfStock = product.variants?.length
                        ? product.variants.every((variant: any) => variant.is_out_of_stock === true)
                        : product.is_out_of_stock === true;

                      return (
                        <Badge variant={isOutOfStock ? "danger" : "success"}>
                          {isOutOfStock ? "Out of Stock" : "In Stock"}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-start gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-semibold">{formatRating(product.average_rating)}</span>
                      {product.total_ratings ? (
                        <span className="text-xs text-gray-500">({product.total_ratings})</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const createdAtParts = getCreatedAtParts(
                        product.created_at || (product as any).createdAt
                      );

                      if (!createdAtParts) {
                        return <span className="text-gray-400">—</span>;
                      }

                      return (
                        <div className="flex flex-col leading-tight">
                          <span>{createdAtParts.date}</span>
                          <span className="text-xs text-gray-500">{createdAtParts.time}</span>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {product.created_by ? (
                      <div className="flex flex-col text-sm">
                        <span className="font-medium">
                          {[product.created_by.firstName, product.created_by.lastName]
                            .filter(Boolean)
                            .join(" ") || "Unknown Creator"}
                        </span>
                        {product.created_by.email && (
                          <span
                            className="text-xs text-gray-500 truncate"
                            title={product.created_by.email}
                          >
                            {product.created_by.email}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div
                      onClick={(event) => handleToggleVisibility(event, product)}
                      className="cursor-pointer inline-block transition-opacity hover:opacity-80"
                      title="Click to toggle visibility"
                    >
                      <Badge variant={getVisibilityVariant(product.visible ?? product.is_active)}>
                        {getVisibilityLabel(product.visible ?? product.is_active)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <IconButton
                        variant="view"
                        disabled={!product.slug}
                        onClick={(event) => {
                          event.stopPropagation();
                          handlePreview(product.slug);
                        }}
                        title={product.slug ? "Preview product" : "Preview unavailable"}
                      />
                      <IconButton
                        variant="edit"
                        href={`/products/${product.id}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          sessionStorage.setItem("highlighted_product_id", product.id.toString());
                        }}
                        title="Edit product"
                      />
                      <IconButton
                        variant="delete"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteClick(product);
                        }}
                        title={isPermanentDeleteMode ? "Delete product permanently" : "Delete product"}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={isPermanentDeleteMode ? "Delete Product Permanently?" : undefined}
        message={isPermanentDeleteMode
          ? `This will permanently delete ${productToDelete?.name_en || "this product"}. This action cannot be undone.`
          : undefined}
        confirmText={isPermanentDeleteMode ? "Delete Permanently" : undefined}
        isPermanent={isPermanentDeleteMode}
        isLoading={deleteProduct.isPending}
      />
    </div>
  );
}