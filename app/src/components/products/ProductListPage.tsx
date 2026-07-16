"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "@/providers/loading-provider";
import {
  useDeleteProduct,
  usePermanentDeleteProduct,
  useProducts,
  useToggleProductStatus,
} from "@/services/products/hooks/use-products";
import {
  Product,
  ProductStatus,
} from "@/services/products/types/product.types";
import { STOREFRONT_CONFIG } from "@/lib/constants";
import { normalizeExternalUrl, openReferenceLink } from "@/lib/reference-link";
import { Package, AlertCircle, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { ProductBulkStatusModal } from "@/components/products/ProductBulkStatusModal";
import { ProductFiltersPanel } from "@/components/products/ProductFiltersPanel";
import { ProductsPageHeader, type ProductsViewMode } from "@/components/products/ProductsPageHeader";
import { getStatusLabel, getStatusVariant } from "@/components/products/product-filter-shared";
import { useProductFilters } from "@/components/products/useProductFilters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { useResolvedFeatureToggles } from "@/hooks/use-resolved-feature-toggles";
import { useAuth } from "@/contexts/auth.context";
import { isSimplifiedProductCreator } from "@/lib/simplified-product-creator";
import { QuickSubmitForm } from "@/components/vendor-submissions/QuickSubmitForm";
import { VendorPendingSubmissionCard } from "@/components/vendor-submissions/VendorPendingSubmissionCard";
import { useVendorSubmissions } from "@/services/vendor-submissions/hooks/use-vendor-submissions";
import type { VendorSubmission } from "@/services/vendor-submissions/types/vendor-submission.types";
import {
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_STATUS_SHORT_LABELS,
  submissionStatusVariant,
} from "@/components/vendor-submissions/submission-status";

interface ProductListPageProps {
  title: string;
  description: string;
  storageKey: string;
  fixedStatus?: ProductStatus;
  showViewToggle?: boolean;
  showReviewViewToggle?: boolean;
  showPricingViewToggle?: boolean;
  showReferenceLinksViewToggle?: boolean;
  viewMode?: ProductsViewMode;
  onViewModeChange?: (mode: ProductsViewMode) => void;
  showStatusFilter?: boolean;
  showBulkStatusChange?: boolean;
  initialStatus?: ProductStatus;
  initialVisible?: boolean;
  onStatusCleared?: () => void;
  /** Vendor portal: open Quick Submit form on mount (e.g. ?create=1). */
  initialShowQuickSubmit?: boolean;
}

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

  if (Array.isArray((product as { images?: string[] }).images)) {
    const searchImages = (product as { images?: string[] }).images ?? [];
    const firstSearchImage = searchImages.find(
      (url) => typeof url === "string" && url.trim().length > 0,
    );
    if (firstSearchImage) {
      return firstSearchImage;
    }
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
  showViewToggle = false,
  showReviewViewToggle = true,
  showPricingViewToggle = false,
  showReferenceLinksViewToggle = false,
  viewMode = "list",
  onViewModeChange,
  showStatusFilter = false,
  showBulkStatusChange = true,
  initialStatus,
  initialVisible,
  onStatusCleared,
  initialShowQuickSubmit = false,
}: ProductListPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isVendorPortalUser = isSimplifiedProductCreator(user);
  const [showQuickSubmit, setShowQuickSubmit] = useState(
    Boolean(initialShowQuickSubmit && isVendorPortalUser),
  );
  const { isEnabled } = useResolvedFeatureToggles();
  const ratingsEnabled = isEnabled("ratings_enabled");
  const { setShowOverlay } = useLoading();
  const filters = useProductFilters({
    storageKey,
    fixedStatus,
    initialStatus,
    initialVisible,
    onStatusCleared,
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
    vendorsEnabled,
    referenceLinksEnabled,
    createdByFilterEnabled,
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

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const isPermanentDeleteMode = productToDelete?.status === "review";

  const { data, isLoading, isFetching, isError, error, refetch } =
    useProducts(productQueryParams);

  const archiveProduct = useDeleteProduct();
  const permanentDeleteProduct = usePermanentDeleteProduct();
  const deleteProductMutation = isPermanentDeleteMode ? permanentDeleteProduct : archiveProduct;
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

  const products = data?.data.data || [];
  const isProductsLoading = isLoading || isAwaitingSearchResults;

  const {
    data: submissionsData,
    refetch: refetchSubmissions,
    isLoading: isSubmissionsLoading,
  } = useVendorSubmissions(
      { page: 1, limit: 100 },
      {
        enabled: isVendorPortalUser,
        refetchInterval: isVendorPortalUser ? 15000 : undefined,
      },
    );
  const pendingSubmissions = (
    (submissionsData?.data ?? []) as VendorSubmission[]
  ).filter((submission) => submission.status !== "materialized");
  const isVendorListLoading =
    isProductsLoading || (isVendorPortalUser && isSubmissionsLoading);
  const hasVendorPending = isVendorPortalUser && pendingSubmissions.length > 0;
  const hasListContent =
    products.length > 0 || (isVendorPortalUser && pendingSubmissions.length > 0);

  useEffect(() => {
    if (initialShowQuickSubmit && isVendorPortalUser) {
      setShowQuickSubmit(true);
    }
  }, [initialShowQuickSubmit, isVendorPortalUser]);

  useEffect(() => {
    if (!showQuickSubmit || !isVendorPortalUser) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById("vendor-quick-submit")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [showQuickSubmit, isVendorPortalUser]);

  useEffect(() => {
    setShowOverlay(
      isProductsLoading ||
        isFetching ||
        (isVendorPortalUser && isSubmissionsLoading),
    );
  }, [
    isProductsLoading,
    isFetching,
    isVendorPortalUser,
    isSubmissionsLoading,
    setShowOverlay,
  ]);

  useEffect(() => {
    if (!isProductsLoading && products.length > 0) {
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
  }, [isProductsLoading, products.length]);

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (productToDelete) {
      try {
        await deleteProductMutation.mutateAsync(productToDelete.id);
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
    if (isVendorPortalUser) {
      setShowQuickSubmit(true);
      return;
    }
    router.push("/products/create");
  };

  const isReviewProduct = (product: Product) => product.status === "review";

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
      <div className="admin-state-page">
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

  return (
    <div className="admin-page">
      <ProductsPageHeader
        title={title}
        description={description}
        onCreate={handleCreateNew}
        showCreate={!(isVendorPortalUser && showQuickSubmit)}
        showViewToggle={showViewToggle}
        showReviewViewToggle={showReviewViewToggle}
        showPricingViewToggle={showPricingViewToggle}
        showReferenceLinksViewToggle={showReferenceLinksViewToggle}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        showStatusFilter={showStatusFilter}
        onBulkStatusClick={
          showBulkStatusChange ? () => setBulkStatusModalOpen(true) : undefined
        }
      />

      {isVendorPortalUser && showQuickSubmit ? (
        <div id="vendor-quick-submit" className="scroll-mt-4">
          <QuickSubmitForm
            onCancel={() => setShowQuickSubmit(false)}
            onSuccess={() => {
              setShowQuickSubmit(false);
              void refetchSubmissions();
              void refetch();
            }}
          />
        </div>
      ) : null}

      {!isVendorPortalUser ? (
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
        createdByFilterEnabled={createdByFilterEnabled}
        showStatusFilter={showStatusFilter}
        fixedStatus={fixedStatus}
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
      ) : null}

      {!isVendorListLoading &&
      !hasListContent &&
      !(isVendorPortalUser && showQuickSubmit) ? (
        <EmptyState
          icon={<Package />}
          title="No products found"
          description={
            fixedStatus
              ? `No products with status \"${fixedStatus}\" were found`
              : isVendorPortalUser
                ? "Click Create to submit a new product for review"
                : "Try adjusting your filters or add new products"
          }
        />
      ) : !isVendorListLoading && hasListContent ? (
        <>
          <div className="flex w-full min-w-0 flex-col gap-3 lg:hidden">
            {hasVendorPending ? (
              <>
                <h2 className="px-0.5 text-sm font-semibold text-gray-600">
                  Pending review
                </h2>
                {pendingSubmissions.map((submission) => {
                  const createdAtParts = getCreatedAtParts(submission.created_at);
                  return (
                    <VendorPendingSubmissionCard
                      key={`submission-${submission.id}`}
                      submission={submission}
                      createdAtLabel={
                        createdAtParts
                          ? `${createdAtParts.date} · ${createdAtParts.time}`
                          : null
                      }
                    />
                  );
                })}
              </>
            ) : null}
            {products.length > 0 && hasVendorPending ? (
              <h2 className="mt-1 px-0.5 text-sm font-semibold text-gray-600">
                Your products
              </h2>
            ) : null}
            {products.map((product) => {
              const imageUrl = getProductImageUrl(product);
              const displayPrice = getProductDisplayPrice(product);
              const createdAtParts = getCreatedAtParts(
                product.created_at || (product as { createdAt?: string }).createdAt,
              );
              // This must use the same aggregate stock field that the list API
              // filters on. Deriving it from variants made filtered out-of-stock
              // products appear as "In Stock" in the admin table.
              const isOutOfStock = product.is_out_of_stock === true;

              return (
                <Card
                  key={product.id}
                  className="!gap-3 !p-3 sm:!p-4"
                  id={`product-row-${product.id}`}
                >
                  <div className="flex gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-primary/20 bg-primary/10 sm:h-16 sm:w-16">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={product.name_en || ""}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900">{product.name_en}</p>
                      {product.name_ar ? (
                        <p className="truncate text-sm text-gray-500" dir="rtl">
                          {product.name_ar}
                        </p>
                      ) : null}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {product.categories?.[0] ? (
                          <Badge
                            variant="default2"
                            className="!max-w-full !px-2 !py-0.5 text-[10px] sm:text-xs"
                          >
                            <span className="truncate">
                              {product.categories[0].name_en}
                            </span>
                          </Badge>
                        ) : null}
                        {showStatusFilter || isVendorPortalUser ? (
                          <Badge
                            variant={getStatusVariant(product.status)}
                            className="!px-2 !py-0.5 text-[10px] sm:text-xs"
                          >
                            {getStatusLabel(product.status)}
                          </Badge>
                        ) : null}
                        <Badge
                          variant={isOutOfStock ? "danger" : "success"}
                          className="!px-2 !py-0.5 text-[10px] sm:text-xs"
                        >
                          {isOutOfStock ? "Out of Stock" : "In Stock"}
                        </Badge>
                        <Badge
                          variant={getVisibilityVariant(product.visible ?? product.is_active)}
                          className="!px-2 !py-0.5 text-[10px] sm:text-xs"
                        >
                          {getVisibilityLabel(product.visible ?? product.is_active)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Brand</p>
                      <p className="truncate font-medium">{product.brand?.name_en || "—"}</p>
                    </div>
                    {vendorsEnabled ? (
                      <div>
                        <p className="text-xs text-gray-500">Vendor</p>
                        <p className="truncate font-medium">
                          {product.vendor?.name_en || product.vendor?.name || "—"}
                        </p>
                      </div>
                    ) : null}
                    <div>
                      <p className="text-xs text-gray-500">Price</p>
                      <p className="font-semibold">
                        {displayPrice?.currentPrice ?? "—"}
                      </p>
                    </div>
                    {ratingsEnabled ? (
                      <div>
                        <p className="text-xs text-gray-500">Rating</p>
                        <p className="flex items-center gap-1 font-medium">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          {formatRating(product.average_rating)}
                        </p>
                      </div>
                    ) : null}
                    {createdAtParts ? (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">Created</p>
                        <p className="text-sm">
                          {createdAtParts.date} · {createdAtParts.time}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-primary/10 pt-3">
                    {referenceLinksEnabled ? (
                      <IconButton
                        variant="external"
                        disabled={!normalizeExternalUrl(product.reference_link)}
                        onClick={() => openReferenceLink(product.reference_link)}
                        title="Open reference link"
                      />
                    ) : null}
                    <IconButton
                      variant="view"
                      disabled={!product.slug}
                      onClick={() => handlePreview(product.slug)}
                      title="Preview product"
                    />
                    <IconButton
                      variant="edit"
                      href={`/products/${product.id}`}
                      onClick={() => {
                        sessionStorage.setItem("highlighted_product_id", product.id.toString());
                      }}
                      title="Edit product"
                    />
                    <IconButton
                      variant="delete"
                      onClick={() => handleDeleteClick(product)}
                      title={isReviewProduct(product) ? "Delete product permanently" : "Delete product"}
                    />
                  </div>
                </Card>
              );
            })}
          </div>

          {data?.data.pagination && products.length > 0 ? (
            <div className="w-full lg:hidden">
              <Pagination
                pagination={{
                  currentPage: data.data.pagination.page,
                  pageSize: data.data.pagination.limit,
                  totalItems: data.data.pagination.total,
                  totalPages: data.data.pagination.totalPages,
                  hasNextPage: data.data.pagination.page < data.data.pagination.totalPages,
                  hasPreviousPage: data.data.pagination.page > 1,
                }}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          ) : null}

          <div className="hidden w-full min-w-0 lg:block">
        <Table
          minWidth="1320px"
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
              {vendorsEnabled && <TableHead width="11%">Vendor</TableHead>}
              <TableHead width="5%">Price</TableHead>
              <TableHead width="7%">Stock</TableHead>
              {ratingsEnabled && <TableHead width="5%">Rating</TableHead>}
              <TableHead width="7%">Created At</TableHead>
              <TableHead width="10%">Created By</TableHead>
              {showStatusFilter || isVendorPortalUser ? (
                <TableHead width="7%">Status</TableHead>
              ) : null}
              <TableHead width="7%">Visibility</TableHead>
              <TableHead width="8%">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isVendorPortalUser &&
              pendingSubmissions.map((submission) => {
                const imageUrl =
                  submission.media?.find((m) => m.is_primary)?.media?.url ||
                  submission.media?.[0]?.media?.url;
                return (
                  <TableRow
                    key={`submission-${submission.id}`}
                    id={`submission-row-${submission.id}`}
                  >
                    <TableCell className="font-mono text-sm text-gray-500">
                      S-{submission.id}
                    </TableCell>
                    <TableCell>
                      <div className="h-14 w-14 relative rounded-lg overflow-hidden bg-primary/10 border border-primary/20">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={submission.title}
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
                        <span className="truncate" title={submission.title}>
                          {submission.title}
                        </span>
                        <span className="text-xs text-gray-500">
                          {SUBMISSION_STATUS_LABELS[submission.status]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-400">—</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-400">—</span>
                    </TableCell>
                    {vendorsEnabled && (
                      <TableCell>
                        <span className="text-gray-400">—</span>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{submission.price}</span>
                        {submission.sale_price != null ? (
                          <span className="text-xs text-gray-500">
                            sale {submission.sale_price}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={submission.stock > 0 ? "success" : "danger"}>
                        {submission.stock > 0 ? "In Stock" : "Out of Stock"}
                      </Badge>
                    </TableCell>
                    {ratingsEnabled && (
                      <TableCell>
                        <span className="text-gray-400">—</span>
                      </TableCell>
                    )}
                    <TableCell>
                      {(() => {
                        const createdAtParts = getCreatedAtParts(
                          submission.created_at,
                        );
                        if (!createdAtParts) {
                          return <span className="text-gray-400">—</span>;
                        }
                        return (
                          <div className="flex flex-col leading-tight">
                            <span>{createdAtParts.date}</span>
                            <span className="text-xs text-gray-500">
                              {createdAtParts.time}
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-400">—</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="warning">Without approval</Badge>
                        <Badge variant={submissionStatusVariant(submission.status)}>
                          {SUBMISSION_STATUS_SHORT_LABELS[submission.status]}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="danger">Hidden</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-400">Pending review</span>
                    </TableCell>
                  </TableRow>
                );
              })}
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
                    <div className="h-14 w-14 relative rounded-lg overflow-hidden bg-primary/10 border border-primary/20">
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
                  {vendorsEnabled && (
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
                  )}
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
                      const isOutOfStock = product.is_out_of_stock === true;

                      return (
                        <Badge variant={isOutOfStock ? "danger" : "success"}>
                          {isOutOfStock ? "Out of Stock" : "In Stock"}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  {ratingsEnabled && (
                  <TableCell>
                    <div className="flex items-center justify-start gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-semibold">{formatRating(product.average_rating)}</span>
                      {product.total_ratings ? (
                        <span className="text-xs text-gray-500">({product.total_ratings})</span>
                      ) : null}
                    </div>
                  </TableCell>
                  )}
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
                  {showStatusFilter || isVendorPortalUser ? (
                    <TableCell>
                      <Badge variant={getStatusVariant(product.status)}>
                        {getStatusLabel(product.status)}
                      </Badge>
                    </TableCell>
                  ) : null}
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
                      {referenceLinksEnabled && (
                      <IconButton
                        variant="external"
                        disabled={!normalizeExternalUrl(product.reference_link)}
                        onClick={(event) => {
                          event.stopPropagation();
                          openReferenceLink(product.reference_link);
                        }}
                        title={
                          normalizeExternalUrl(product.reference_link)
                            ? "Open reference link"
                            : "No reference link"
                        }
                      />
                      )}
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
                        title={isReviewProduct(product) ? "Delete product permanently" : "Delete product"}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
          </div>
        </>
      ) : null}

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
        isLoading={deleteProductMutation.isPending}
      />

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