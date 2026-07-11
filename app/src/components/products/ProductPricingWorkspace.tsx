"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLoading } from "@/providers/loading-provider";
import { useRouter } from "@/hooks/use-loading-router";
import { useProducts, useUpdateProduct } from "@/services/products/hooks/use-products";
import type { Product, UpdateProductDto } from "@/services/products/types/product.types";
import { Package, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { ProductFiltersPanel } from "@/components/products/ProductFiltersPanel";
import { ProductBulkStatusModal } from "@/components/products/ProductBulkStatusModal";
import { ProductsPageHeader, type ProductsViewMode } from "@/components/products/ProductsPageHeader";
import { useProductFilters } from "@/components/products/useProductFilters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useResolvedFeatureToggles } from "@/hooks/use-resolved-feature-toggles";
import { showSuccessToast } from "@/lib/toast";

type PricingDraft = {
  cost: string;
  price: string;
  salePrice: string;
  originalPrice: string;
  originalSalePrice: string;
  isSaleEnabled: boolean;
};

type PricingFieldErrors = {
  cost?: string;
  price?: string;
  salePrice?: string;
  originalPrice?: string;
  originalSalePrice?: string;
};

interface ProductPricingWorkspaceProps {
  title?: string;
  description?: string;
  storageKey?: string;
  showViewToggle?: boolean;
  showPricingViewToggle?: boolean;
  showStatusFilter?: boolean;
  viewMode?: ProductsViewMode;
  onViewModeChange?: (mode: ProductsViewMode) => void;
}

const formatPriceValue = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toNumericString = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return String(num);
};

const formatDisplayPrice = (value: unknown) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return formatPriceValue(num);
};

const parsePriceInput = (value: string): number | null => {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
};

const validatePricingDraft = (
  draft: PricingDraft,
  options: { includeOriginalPrices?: boolean } = {},
): PricingFieldErrors => {
  const errors: PricingFieldErrors = {};
  const price = parsePriceInput(draft.price);
  const includeOriginalPrices = options.includeOriginalPrices !== false;

  if (price === null) {
    errors.price = "Enter a valid price.";
  }

  const costRaw = draft.cost.replace(/,/g, "").trim();
  if (costRaw && parsePriceInput(draft.cost) === null) {
    errors.cost = "Enter a valid cost.";
  }

  if (draft.isSaleEnabled) {
    const salePrice = parsePriceInput(draft.salePrice);
    if (salePrice === null) {
      errors.salePrice = "Enter a valid sale price.";
    } else if (price !== null && salePrice > price) {
      errors.salePrice = "Sale price cannot be higher than price.";
    }
  }

  if (!includeOriginalPrices) {
    return errors;
  }

  const originalPriceRaw = draft.originalPrice.replace(/,/g, "").trim();
  const originalSalePriceRaw = draft.originalSalePrice.replace(/,/g, "").trim();
  const originalPrice = parsePriceInput(draft.originalPrice);
  const originalSalePrice = parsePriceInput(draft.originalSalePrice);

  if (originalPriceRaw && originalPrice === null) {
    errors.originalPrice = "Enter a valid original price.";
  }

  if (originalSalePriceRaw && originalSalePrice === null) {
    errors.originalSalePrice = "Enter a valid original sale price.";
  }

  if (
    originalPrice !== null &&
    originalSalePrice !== null &&
    originalSalePrice > originalPrice
  ) {
    errors.originalSalePrice = "Original sale price cannot be higher than original price.";
  }

  return errors;
};

const isProductOnSale = (product: Product) =>
  product.sale_price !== null &&
  product.sale_price !== undefined &&
  product.sale_price !== "";

const buildDraft = (product: Product): PricingDraft => ({
  cost: toNumericString(product.cost),
  price: toNumericString(product.price),
  salePrice: toNumericString(product.sale_price),
  originalPrice: toNumericString(product.original_vendor_price),
  originalSalePrice: toNumericString(product.original_vendor_sale_price),
  isSaleEnabled: isProductOnSale(product),
});

const getProductImageUrl = (product: Product) => {
  if (product.primary_image?.url) return product.primary_image.url;
  if (typeof product.image === "string" && product.image.trim()) return product.image;
  if (Array.isArray(product.media) && product.media[0]?.url) return product.media[0].url;
  return null;
};

const formatCategoryName = (name: string | undefined) => {
  if (!name) return "";
  const words = name.trim().split(/\s+/);
  if (words.length <= 1) return name;
  return `${words[0]} ${words[1].slice(0, 3)}...`;
};

function InlinePriceInput({
  value,
  onChange,
  disabled = false,
  placeholder = "0.00",
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`h-9 w-full min-w-[88px] rounded-lg border bg-white px-2 text-sm font-medium text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
          error
            ? "border-danger focus:border-danger focus:ring-2 focus:ring-danger/20"
            : "border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
        }`}
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function OnSaleToggle({
  enabled,
  interactive,
  disabled = false,
  onToggle,
}: {
  enabled: boolean;
  interactive: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <IconButton
      variant={enabled ? "check" : "cancel"}
      disabled={disabled || !interactive}
      onClick={(event) => {
        event.stopPropagation();
        if (interactive && !disabled) onToggle();
      }}
      title={
        interactive
          ? enabled
            ? "Disable on sale"
            : "Enable on sale"
          : enabled
            ? "On sale enabled"
            : "On sale disabled"
      }
    />
  );
}

export function ProductPricingWorkspace({
  title = "Pricing Products",
  description = "Manage product pricing in one place.",
  storageKey = "pricing_products",
  showViewToggle = false,
  showPricingViewToggle = false,
  showStatusFilter = false,
  viewMode = "pricing",
  onViewModeChange,
}: ProductPricingWorkspaceProps = {}) {
  const router = useRouter();
  const { isEnabled } = useResolvedFeatureToggles();
  const vendorsEnabled = isEnabled("vendors_enabled");
  const { setShowOverlay } = useLoading();

  const filters = useProductFilters({
    storageKey,
  });

  const {
    queryParams,
    productQueryParams,
    isAwaitingSearchResults,
    searchTerm,
    minPrice,
    maxPrice,
    startDate,
    endDate,
    selectedVendorIds,
    selectedBrandIds,
    selectedCategoryIds,
    selectedCreatedByIds,
    referenceLinksEnabled,
    vendorOptions,
    brandOptions,
    categoryOptions,
    adminOptions,
    categoriesData,
    hasActiveFilters,
    todayStr,
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
    handlePageChange,
    handlePageSizeChange,
  } = filters;

  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, PricingDraft>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<number, PricingFieldErrors>>({});
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useProducts(productQueryParams);
  const updateProduct = useUpdateProduct();

  const products = data?.data.data || [];
  const isProductsLoading = isLoading || isAwaitingSearchResults;

  useEffect(() => {
    setShowOverlay(isProductsLoading || isFetching);
  }, [isProductsLoading, isFetching, setShowOverlay]);

  const getDraft = (product: Product) => drafts[product.id] ?? buildDraft(product);

  const updateDraft = (productId: number, patch: Partial<PricingDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] ?? buildDraft(products.find((item) => item.id === productId)!)),
        ...patch,
      },
    }));

    setFieldErrors((prev) => {
      if (!prev[productId]) return prev;
      const next = { ...prev[productId] };
      if ("cost" in patch) delete next.cost;
      if ("price" in patch) delete next.price;
      if ("salePrice" in patch || "isSaleEnabled" in patch) delete next.salePrice;
      if ("originalPrice" in patch) delete next.originalPrice;
      if ("originalSalePrice" in patch) delete next.originalSalePrice;
      if (Object.keys(next).length === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: next };
    });
  };

  const startEditing = (product: Product) => {
    setEditingProductId(product.id);
    setDrafts((prev) => ({ ...prev, [product.id]: buildDraft(product) }));
    setFieldErrors((prev) => {
      if (!prev[product.id]) return prev;
      const { [product.id]: _, ...rest } = prev;
      return rest;
    });
  };

  const cancelEditing = () => {
    if (editingProductId !== null) {
      setFieldErrors((prev) => {
        if (!prev[editingProductId]) return prev;
        const { [editingProductId]: _, ...rest } = prev;
        return rest;
      });
    }
    setEditingProductId(null);
  };

  const setSaleEnabled = (productId: number, enabled: boolean) => {
    if (editingProductId !== productId) return;
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    const draft = getDraft(product);
    updateDraft(productId, {
      isSaleEnabled: enabled,
      salePrice: enabled ? draft.salePrice : "",
    });
  };

  const savePricing = async (product: Product) => {
    const draft = getDraft(product);
    const validationErrors = validatePricingDraft(draft, {
      includeOriginalPrices: vendorsEnabled,
    });
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, [product.id]: validationErrors }));
      return;
    }

    const price = parsePriceInput(draft.price)!;
    const cost = parsePriceInput(draft.cost);
    const salePrice = draft.isSaleEnabled ? parsePriceInput(draft.salePrice) : null;
    const originalPrice = parsePriceInput(draft.originalPrice);
    const originalSalePrice = parsePriceInput(draft.originalSalePrice);

    const categoryIds = Array.isArray(product.category_ids)
      ? product.category_ids
      : Array.isArray(product.categories)
        ? product.categories.map((c) => Number(c.id)).filter((id) => Number.isInteger(id))
        : product.category?.id
          ? [product.category.id]
          : [];

    const payload: UpdateProductDto = {
      name_en: product.name_en || "",
      name_ar: product.name_ar || "",
      sku: product.sku || "",
      short_description_en: product.short_description_en || "",
      short_description_ar: product.short_description_ar || "",
      long_description_en: product.long_description_en || "",
      long_description_ar: product.long_description_ar || "",
      category_ids: categoryIds,
      cost: cost !== null ? cost : null,
      price,
      sale_price: draft.isSaleEnabled ? salePrice ?? undefined : null,
      linked_product_ids: vendorsEnabled && Array.isArray(product.linked_product_ids)
        ? product.linked_product_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id))
        : [],
    };

    if (vendorsEnabled) {
      const currentOriginalPrice = parsePriceInput(
        toNumericString(product.original_vendor_price),
      );
      const currentOriginalSalePrice = parsePriceInput(
        toNumericString(product.original_vendor_sale_price),
      );

      if (originalPrice !== currentOriginalPrice) {
        payload.original_vendor_price = originalPrice;
      }

      if (originalSalePrice !== currentOriginalSalePrice) {
        payload.original_vendor_sale_price = originalSalePrice;
      }
    }

    await updateProduct.mutateAsync({ id: product.id, data: payload });
    showSuccessToast(`Pricing saved for product #${product.id}`);
    setFieldErrors((prev) => {
      if (!prev[product.id]) return prev;
      const { [product.id]: _, ...rest } = prev;
      return rest;
    });
    setEditingProductId(null);
    void refetch();
  };

  if (isError) {
    return (
      <div className="admin-state-page">
        <div className="mx-auto">
          <Card>
            <div className="p-12 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-danger/10 p-3">
                  <AlertCircle className="h-8 w-8 text-danger" />
                </div>
              </div>
              <h3 className="text-xl font-bold">Error Loading Products</h3>
              <p className="max-w-md mx-auto">{error.message}</p>
              <Button onClick={() => refetch()}>Try Again</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <ProductsPageHeader
        title={title}
        description={description}
        onCreate={() => router.push("/products/create")}
        showViewToggle={showViewToggle}
        showPricingViewToggle={showPricingViewToggle}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        showStatusFilter={showStatusFilter}
        onBulkStatusClick={
          showStatusFilter ? () => setBulkStatusModalOpen(true) : undefined
        }
      />

      <ProductFiltersPanel
        visible={products.length > 0 || hasActiveFilters}
        hasActiveFilters={hasActiveFilters}
        onClearAllFilters={handleClearAllFilters}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        categories={categoriesData.data ?? []}
        selectedCategoryIds={selectedCategoryIds}
        onCategoryChange={handleCategoryChange}
        categoryOptionsCount={categoryOptions.length}
        vendorsEnabled={vendorsEnabled}
        selectedVendorIds={selectedVendorIds}
        onVendorChange={handleVendorChange}
        vendorOptions={vendorOptions}
        selectedBrandIds={selectedBrandIds}
        onBrandChange={handleBrandChange}
        brandOptions={brandOptions}
        startDate={startDate}
        endDate={endDate}
        onDateChange={handleDateChange}
        todayStr={todayStr}
        selectedCreatedByIds={selectedCreatedByIds}
        onCreatedByChange={handleCreatedByChange}
        adminOptions={adminOptions}
        showStatusFilter={showStatusFilter}
        queryParams={queryParams}
        onStatusFilterChange={handleStatusFilterChange}
        onStockChange={handleStockChange}
        onVisibilityChange={handleVisibilityChange}
        referenceLinksEnabled={referenceLinksEnabled}
        onDuplicateReferenceLinkChange={handleDuplicateReferenceLinkChange}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onMinPriceChange={setMinPrice}
        onMaxPriceChange={setMaxPrice}
      />

      {!isProductsLoading && products.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title="No products found"
          description="Try adjusting your filters or add new products"
        />
      ) : (
        !isProductsLoading && (
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
                <TableHead width="14%">Product Name</TableHead>
                <TableHead width="8%">Category</TableHead>
                <TableHead width="11%">Brand</TableHead>
                {vendorsEnabled ? <TableHead width="11%">Vendor</TableHead> : null}
                <TableHead width="7%">Cost</TableHead>
                {vendorsEnabled ? <TableHead width="8%">Original Price</TableHead> : null}
                {vendorsEnabled ? <TableHead width="8%">Original Sale</TableHead> : null}
                <TableHead width="7%">Price</TableHead>
                <TableHead width="7%">Sale Price</TableHead>
                <TableHead width="8%">On Sale</TableHead>
                <TableHead width="6%">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const imageUrl = getProductImageUrl(product);
                const isEditing = editingProductId === product.id;
                const draft = getDraft(product);
                const isSaving =
                  updateProduct.isPending && updateProduct.variables?.id === product.id;
                const onSale = isEditing ? draft.isSaleEnabled : isProductOnSale(product);
                const rowErrors = fieldErrors[product.id] ?? {};

                return (
                  <TableRow key={product.id} id={`pricing-product-row-${product.id}`}>
                    <TableCell className="font-mono text-sm">{product.id}</TableCell>
                    <TableCell>
                      <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-primary/20 bg-primary/10">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={product.name_en || ""}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
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
                        <span className="truncate text-sm text-gray-500" title={product.name_ar}>
                          {product.name_ar}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.categories && product.categories.length > 0 ? (
                        <span title={product.categories[0].name_en} className="block max-w-[90px]">
                          <Badge
                            variant="default2"
                            className="block w-full overflow-hidden text-ellipsis whitespace-nowrap"
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
                          {product.brand?.logo ? (
                            <div className="relative h-15 w-15 overflow-hidden rounded-lg border border-primary/20">
                              <Image
                                src={product.brand.logo}
                                alt={product.brand.name_en || ""}
                                fill
                                className="object-contain"
                              />
                            </div>
                          ) : null}
                          <span className="text-sm">
                            {product.brand?.name_en || <span className="text-gray-400">—</span>}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    {vendorsEnabled ? (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {product.vendor?.logo ? (
                            <div className="relative h-15 w-15 overflow-hidden rounded-lg border border-primary/20">
                              <Image
                                src={product.vendor.logo}
                                alt={product.vendor.name_en || ""}
                                fill
                                className="object-contain"
                              />
                            </div>
                          ) : null}
                          <span className="text-sm">
                            {product.vendor?.name_en || product.vendor?.name || (
                              <span className="text-gray-400">—</span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                    ) : null}
                    <TableCell>
                      {isEditing ? (
                        <InlinePriceInput
                          value={draft.cost}
                          onChange={(value) => updateDraft(product.id, { cost: value })}
                          disabled={isSaving}
                          error={rowErrors.cost}
                        />
                      ) : (
                        <span className="font-semibold">{formatDisplayPrice(product.cost)}</span>
                      )}
                    </TableCell>
                    {vendorsEnabled ? (
                      <TableCell>
                        {isEditing ? (
                          <InlinePriceInput
                            value={draft.originalPrice}
                            onChange={(value) =>
                              updateDraft(product.id, { originalPrice: value })
                            }
                            disabled={isSaving}
                            error={rowErrors.originalPrice}
                          />
                        ) : (
                          <span className="font-semibold">
                            {formatDisplayPrice(product.original_vendor_price)}
                          </span>
                        )}
                      </TableCell>
                    ) : null}
                    {vendorsEnabled ? (
                      <TableCell>
                        {isEditing ? (
                          <InlinePriceInput
                            value={draft.originalSalePrice}
                            onChange={(value) =>
                              updateDraft(product.id, { originalSalePrice: value })
                            }
                            disabled={isSaving}
                            error={rowErrors.originalSalePrice}
                          />
                        ) : (
                          <span className="font-semibold">
                            {formatDisplayPrice(product.original_vendor_sale_price)}
                          </span>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      {isEditing ? (
                        <InlinePriceInput
                          value={draft.price}
                          onChange={(value) => updateDraft(product.id, { price: value })}
                          disabled={isSaving}
                          error={rowErrors.price}
                        />
                      ) : (
                        <span className="font-semibold">{formatDisplayPrice(product.price)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <InlinePriceInput
                          value={draft.salePrice}
                          onChange={(value) => updateDraft(product.id, { salePrice: value })}
                          disabled={isSaving || !draft.isSaleEnabled}
                          error={rowErrors.salePrice}
                        />
                      ) : (
                        <span className="font-semibold">
                          {onSale ? formatDisplayPrice(product.sale_price) : "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <OnSaleToggle
                        enabled={onSale}
                        interactive={isEditing}
                        disabled={isSaving}
                        onToggle={() => setSaleEnabled(product.id, !draft.isSaleEnabled)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {isEditing ? (
                          <>
                            <IconButton
                              variant="check"
                              disabled={isSaving}
                              onClick={(event) => {
                                event.stopPropagation();
                                void savePricing(product);
                              }}
                              title="Save pricing"
                            />
                            <IconButton
                              variant="cancel"
                              disabled={isSaving}
                              onClick={(event) => {
                                event.stopPropagation();
                                cancelEditing();
                              }}
                              title="Cancel editing"
                            />
                          </>
                        ) : (
                          <IconButton
                            variant="edit"
                            disabled={editingProductId !== null}
                            onClick={(event) => {
                              event.stopPropagation();
                              startEditing(product);
                            }}
                            title="Edit pricing"
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )
      )}

      <ProductBulkStatusModal
        isOpen={bulkStatusModalOpen}
        onClose={() => setBulkStatusModalOpen(false)}
        vendorsEnabled={vendorsEnabled}
        vendorOptions={vendorOptions}
        categories={categoriesData.data ?? []}
        onSuccess={() => void refetch()}
      />
    </div>
  );
}
