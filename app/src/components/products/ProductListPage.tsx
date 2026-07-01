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
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { useResolvedFeatureToggles } from "@/hooks/use-resolved-feature-toggles";

interface ProductListPageProps {
  title: string;
  description: string;
  storageKey: string;
  fixedStatus?: ProductStatus;
  showViewToggle?: boolean;
  showPricingViewToggle?: boolean;
  viewMode?: ProductsViewMode;
  onViewModeChange?: (mode: ProductsViewMode) => void;
  showStatusFilter?: boolean;
  initialStatus?: ProductStatus;
  onStatusCleared?: () => void;
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
  showPricingViewToggle = false,
  viewMode = "list",
  onViewModeChange,
  showStatusFilter = false,
  initialStatus,
  onStatusCleared,
}: ProductListPageProps) {
  const router = useRouter();
  const { isEnabled } = useResolvedFeatureToggles();
  const ratingsEnabled = isEnabled("ratings_enabled");
  const { setShowOverlay } = useLoading();
  const filters = useProductFilters({
    storageKey,
    fixedStatus,
    initialStatus,
    onStatusCleared,
  });
  const {
    queryParams,
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

  const { data, isLoading, isError, error, refetch } = useProducts(queryParams);
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

  return (
    <div className="flex flex-col justify-center items-center gap-5 p-5">
      <ProductsPageHeader
        title={title}
        description={description}
        onCreate={handleCreateNew}
        showViewToggle={showViewToggle}
        showPricingViewToggle={showPricingViewToggle}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        showStatusFilter={showStatusFilter}
        onBulkStatusClick={() => setBulkStatusModalOpen(true)}
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
              {vendorsEnabled && <TableHead width="11%">Vendor</TableHead>}
              <TableHead width="5%">Price</TableHead>
              <TableHead width="7%">Stock</TableHead>
              {ratingsEnabled && <TableHead width="5%">Rating</TableHead>}
              <TableHead width="7%">Created At</TableHead>
              <TableHead width="10%">Created By</TableHead>
              {showStatusFilter ? <TableHead width="7%">Status</TableHead> : null}
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
                  {showStatusFilter ? (
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