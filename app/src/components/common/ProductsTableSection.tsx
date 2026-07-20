"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Package } from "lucide-react";
import { Button } from "../ui/button";
import { ProductSelectionModal } from "./ProductSelectionModal";
import { Badge } from "../ui/badge";
import { ProductCatalogTable } from "./ProductCatalogTable";
import type { ProductItem } from "./product-table-utils";
import { mapProductToProductItem } from "./product-table-utils";
import { useProducts } from "../../services/products/hooks/use-products";
import type { ProductFilters } from "../../services/products/types/product.types";
import { PAGINATION } from "../../lib/constants";

export type { ProductItem } from "./product-table-utils";

/** Server-side list scope for edit pages (category / brand / vendor). */
export type ProductListScope = Pick<
  ProductFilters,
  "category_ids" | "brand_ids" | "vendor_ids" | "vendor_id" | "brandId" | "categoryId"
>;

interface ProductsTableSectionProps {
  title?: string;
  products: ProductItem[];
  onProductsChange: (product_ids: number[]) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  editButtonText?: string;
  modalTitle?: string;
  allProducts?: ProductItem[];
  addButtonText?: string;
  /**
   * When set, table rows are loaded page-by-page from GET /products with these
   * filters. `products` is then only used as a seed for pending modal adds
   * (create flow still passes the full local list and omits this prop).
   */
  productListScope?: ProductListScope;
  /** Full assigned ID set for selection / save diffs (from entity.product_ids). */
  assignedProductIds?: number[];
}

export const ProductsTableSection: React.FC<ProductsTableSectionProps> = ({
  title = "Products",
  products,
  onProductsChange,
  isLoading = false,
  emptyMessage = "No products assigned",
  editButtonText = "Manage Products",
  modalTitle = "Select Products",
  productListScope,
  assignedProductIds,
}) => {
  const serverPaged = Boolean(productListScope);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState<number>(PAGINATION.defaultPage);
  const [pageSize, setPageSize] = useState<number>(PAGINATION.defaultPageSize);

  const [displayProducts, setDisplayProducts] = useState<ProductItem[]>(products);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>(() =>
    assignedProductIds ?? products.map((product) => product.id)
  );
  const [pendingAddProducts, setPendingAddProducts] = useState<ProductItem[]>([]);

  const listParams = useMemo<ProductFilters | undefined>(() => {
    if (!productListScope) {
      return undefined;
    }
    return {
      ...productListScope,
      page,
      limit: pageSize,
    };
  }, [productListScope, page, pageSize]);

  const {
    data: serverData,
    isLoading: isServerLoading,
    isFetching: isServerFetching,
  } = useProducts(listParams, {
    enabled: serverPaged && Boolean(listParams),
  });

  const serverProducts = useMemo(() => {
    const rows = serverData?.data?.data || [];
    return rows.map((product) => mapProductToProductItem(product as any));
  }, [serverData]);

  const serverMeta = serverData?.data?.pagination;
  const serverTotal = serverMeta?.total ?? 0;

  // Sync selection baseline when assigned IDs load / change (edit entity fetch).
  const assignedProductIdsKey = useMemo(
    () => (assignedProductIds ?? []).join(","),
    [assignedProductIds]
  );

  const localProductsKey = useMemo(
    () => products.map((product) => product.id).join(","),
    [products]
  );

  useEffect(() => {
    if (!serverPaged) {
      return;
    }
    setSelectedProductIds(assignedProductIds ?? []);
    setPendingAddProducts([]);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedProductIdsKey, serverPaged]);

  // Client-side mode: sync from parent only when the assigned ID set changes.
  useEffect(() => {
    if (serverPaged) {
      return;
    }
    setDisplayProducts(products);
    setSelectedProductIds(products.map((product) => product.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localProductsKey, serverPaged]);

  const assignedIdSet = useMemo(
    () => new Set(assignedProductIds ?? products.map((product) => product.id)),
    [assignedProductIds, products]
  );

  const pendingAddsOnPage = useMemo(() => {
    if (!serverPaged || page !== 1) {
      return [];
    }
    const serverIds = new Set(serverProducts.map((product) => product.id));
    return pendingAddProducts.filter(
      (product) =>
        selectedProductIds.includes(product.id) && !serverIds.has(product.id)
    );
  }, [serverPaged, page, pendingAddProducts, selectedProductIds, serverProducts]);

  const tableProducts = useMemo(() => {
    if (!serverPaged) {
      const startIndex = (page - 1) * pageSize;
      return displayProducts.slice(startIndex, startIndex + pageSize);
    }
    // Page 1: show pending adds that are not yet on the server assignment list.
    return [...pendingAddsOnPage, ...serverProducts];
  }, [
    serverPaged,
    page,
    pageSize,
    displayProducts,
    pendingAddsOnPage,
    serverProducts,
  ]);

  const selectedProducts = useMemo(() => {
    const selectedIdSet = new Set(selectedProductIds);
    const fromTable = tableProducts.filter((product) => selectedIdSet.has(product.id));
    const fromPending = pendingAddProducts.filter((product) =>
      selectedIdSet.has(product.id)
    );
    const byId = new Map<number, ProductItem>();
    [...fromPending, ...fromTable].forEach((product) => byId.set(product.id, product));
    return [...byId.values()];
  }, [tableProducts, selectedProductIds, pendingAddProducts]);

  // Badge / footer: selected count is source of truth for assignment state.
  const badgeCount = selectedProductIds.length;

  // Server pagination total = assigned on server ± pending add/remove.
  const serverPaginationTotal = useMemo(() => {
    if (!serverPaged) {
      return displayProducts.length;
    }
    const pendingAddCount = selectedProductIds.filter((id) => !assignedIdSet.has(id)).length;
    const pendingRemoveCount = [...assignedIdSet].filter(
      (id) => !selectedProductIds.includes(id)
    ).length;
    return Math.max(0, serverTotal + pendingAddCount - pendingRemoveCount);
  }, [
    serverPaged,
    displayProducts.length,
    selectedProductIds,
    assignedIdSet,
    serverTotal,
  ]);

  const totalPages = serverPaged
    ? Math.max(1, Math.ceil(serverPaginationTotal / pageSize) || 1)
    : Math.ceil(displayProducts.length / pageSize) || 1;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const updateSelection = (productIds: number[], nextProducts?: ProductItem[]) => {
    setSelectedProductIds(productIds);
    if (nextProducts) {
      if (serverPaged) {
        setPendingAddProducts((prev) => {
          const byId = new Map(prev.map((product) => [product.id, product]));
          nextProducts.forEach((product) => {
            if (!assignedIdSet.has(product.id)) {
              byId.set(product.id, product);
            }
          });
          // Drop pending rows that were unselected.
          const selected = new Set(productIds);
          return [...byId.values()].filter((product) => selected.has(product.id));
        });
      } else {
        setDisplayProducts((prevProducts) => {
          const prevIds = new Set(prevProducts.map((product) => product.id));
          const merged = [...prevProducts];
          nextProducts.forEach((product) => {
            if (!prevIds.has(product.id)) {
              merged.push(product);
            }
          });
          return merged;
        });
      }
    }
    onProductsChange(productIds);
  };

  const handleSelectionChange = (productIds: number[], nextProducts?: ProductItem[]) => {
    updateSelection(productIds, nextProducts);
  };

  const handleToggleProduct = (productId: number) => {
    const nextIds = selectedProductIds.includes(productId)
      ? selectedProductIds.filter((id) => id !== productId)
      : [...selectedProductIds, productId];

    updateSelection(nextIds);
  };

  const handleToggleAll = (currentPageIds: number[], allSelected: boolean) => {
    const nextIds = allSelected
      ? selectedProductIds.filter((id) => !currentPageIds.includes(id))
      : [...new Set([...selectedProductIds, ...currentPageIds])];

    updateSelection(nextIds);
  };

  const showEmpty =
    !isLoading &&
    !isServerLoading &&
    (serverPaged ? serverPaginationTotal === 0 : displayProducts.length === 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {title}{" "}
          <Badge variant="secondary" className="ml-2">
            {badgeCount}
          </Badge>
        </h3>
        <Button
          variant="solid"
          onClick={() => setIsModalOpen(true)}
          disabled={isLoading || isServerLoading}
        >
          {editButtonText}
        </Button>
      </div>

      {/* Products Table */}
      {showEmpty ? (
        <div className="flex flex-col items-center justify-center py-10 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
          <div className="bg-white p-4 rounded-full shadow-sm mb-3">
            <Package className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">{emptyMessage}</p>
          <Button onClick={() => setIsModalOpen(true)} className="mt-2 text-primary hover:underline">
            Add your first product
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
          {serverPaged && isServerFetching ? (
            <div className="absolute inset-0 bg-white/50 z-10 pointer-events-none" />
          ) : null}
          <ProductCatalogTable
            products={tableProducts}
            pagination={{
              currentPage: page,
              totalPages,
              pageSize,
              totalItems: serverPaged ? serverPaginationTotal : displayProducts.length,
              hasNextPage: page < totalPages,
              hasPreviousPage: page > 1,
            }}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
            selectable={true}
            selectedProductIds={selectedProductIds}
            onToggleProduct={handleToggleProduct}
            onToggleAll={handleToggleAll}
          />
        </div>
      )}

      {/* Product Selection Modal */}
      <ProductSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedProductIds={selectedProductIds}
        selectedProducts={selectedProducts}
        onSelectionChange={handleSelectionChange}
        title={modalTitle}
      />
    </div>
  );
};
