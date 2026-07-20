"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Package } from "lucide-react";
import { Button } from "../ui/button";
import { ProductSelectionModal } from "./ProductSelectionModal";
import { Badge } from "../ui/badge";
import { ProductCatalogTable } from "./ProductCatalogTable";
import type { ProductItem } from "./product-table-utils";

export type { ProductItem } from "./product-table-utils";

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
}

export const ProductsTableSection: React.FC<ProductsTableSectionProps> = ({
  title = "Products",
  products,
  onProductsChange,
  isLoading = false,
  emptyMessage = "No products assigned",
  editButtonText = "Manage Products",
  modalTitle = "Select Products",
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Local pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [displayProducts, setDisplayProducts] = useState<ProductItem[]>(products);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>(() =>
    products.map((product) => product.id)
  );

  // Sync from parent only when the assigned ID set changes (edit load / refetch).
  // Comparing by IDs avoids wiping modal selections when parents pass a new []
  // reference each render, or a partial catalog-derived subset after selection.
  const assignedProductIdsKey = useMemo(
    () => products.map((product) => product.id).join(","),
    [products]
  );

  useEffect(() => {
    setDisplayProducts(products);
    setSelectedProductIds(products.map((product) => product.id));
    // products is read from the render where assignedProductIdsKey changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedProductIdsKey]);

  // Checked products pending page Save Changes. Kept separate from displayProducts
  // so unchecking does not remove rows from the table until the page is saved.
  const selectedProducts = useMemo(() => {
    const selectedIdSet = new Set(selectedProductIds);
    return displayProducts.filter((product) => selectedIdSet.has(product.id));
  }, [displayProducts, selectedProductIds]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return displayProducts.slice(startIndex, startIndex + pageSize);
  }, [page, pageSize, displayProducts]);

  const totalPages = Math.ceil(displayProducts.length / pageSize) || 1;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const updateSelection = (productIds: number[], nextProducts?: ProductItem[]) => {
    setSelectedProductIds(productIds);
    // Keep existing rows visible when unselecting. Only append newly selected
    // products from the modal; removals apply when the page Save Changes persists.
    if (nextProducts) {
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title} <Badge variant="secondary" className="ml-2">{selectedProductIds.length}</Badge></h3>
        <Button variant="solid" onClick={() => setIsModalOpen(true)} disabled={isLoading}>
          {editButtonText}
        </Button>
      </div>

      {/* Products Table */}
      {displayProducts.length === 0 ? (
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <ProductCatalogTable
            products={paginatedProducts}
            pagination={{
              currentPage: page,
              totalPages,
              pageSize,
              totalItems: displayProducts.length,
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










