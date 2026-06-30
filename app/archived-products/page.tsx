"use client";

/**
 * Archived Products Page
 * Page component for displaying and managing archived products
 */

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "../src/providers/loading-provider";
import Image from "next/image";
import {
  useArchivedProducts,
  useRestoreProduct,
  usePermanentDeleteProduct,
} from "../src/services/products/hooks/use-products";
import { Archive, Package, RefreshCw, AlertCircle, X } from "lucide-react";
import { Card } from "../src/components/ui/card";
import { Button } from "../src/components/ui/button";
import { IconButton } from "../src/components/ui/icon-button";
import { PageHeader } from "../src/components/common/PageHeader";
import { EmptyState } from "../src/components/common/EmptyState";
import { Input } from "../src/components/ui/input";
import { Badge } from "../src/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../src/components/ui/table";
import { DeleteConfirmationModal } from "../src/components/common/DeleteConfirmationModal";
import { RestoreConfirmationModal } from "../src/components/common/RestoreConfirmationModal";
import { Product } from "../src/services/products/types/product.types";
import { useResolvedFeatureToggles } from "../src/hooks/use-resolved-feature-toggles";

export default function ArchivedProductsPage() {
  const router = useRouter();
  const { setShowOverlay } = useLoading();
  const { isEnabled } = useResolvedFeatureToggles();
  const vendorsEnabled = isEnabled("vendors_enabled");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productToRestore, setProductToRestore] = useState<Product | null>(null);

  const { data: productsData, isLoading, isError, error, refetch } = useArchivedProducts();
  const restoreProduct = useRestoreProduct();
  const permanentDeleteProduct = usePermanentDeleteProduct();

  // Show loading overlay while data is loading
  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  const products = productsData?.data || [];

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    if (!searchTerm) return products;

    const term = searchTerm.toLowerCase();
    return products.filter(
      (product) =>
        product.name_en.toLowerCase().includes(term) ||
        product.name_ar.includes(searchTerm) ||
        product.id.toString().includes(term) ||
        product.sku?.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const handleRestoreClick = (product: Product) => {
    setProductToRestore(product);
    setRestoreModalOpen(true);
  };

  const handleRestoreConfirm = async () => {
    if (productToRestore) {
      try {
        await restoreProduct.mutateAsync({ id: productToRestore.id });
        setRestoreModalOpen(false);
        setProductToRestore(null);
      } catch (error) {
        console.error("Failed to restore product:", error);
      }
    }
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (productToDelete) {
      try {
        await permanentDeleteProduct.mutateAsync(productToDelete.id);
        setDeleteModalOpen(false);
        setProductToDelete(null);
      } catch (error) {
        console.error("Failed to permanently delete product:", error);
      }
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
  };

  const hasActiveFilters = !!searchTerm;

  const formatDate = (date: string | Date | undefined | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
              <h3 className="text-xl font-bold mt-4">Error Loading Archived Products</h3>
              <p className="mt-2 max-w-md mx-auto">
                {error instanceof Error ? error.message : "An error occurred"}
              </p>
              <Button onClick={() => refetch()} className="mt-4">
                Try Again
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center gap-5 p-5">
      <PageHeader
        icon={<Archive />}
        title="Archived Products"
        description="Manage archived products - restore or permanently delete"
        iconBgColor="bg-danger"
        action={{
          label: "View Active Products",
          onClick: () => router.push("/products"),
        }}
      />

      {/* Filters */}
      {(filteredProducts.length > 0 || hasActiveFilters) && (
        <Card>
          <h2 className="text-lg font-semibold">Filters</h2>
          <div className="flex items-center gap-5">
            <div className="relative flex-1 max-w-sm">
              <Input
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                label="Search"
                variant="search"
              />
            </div>

            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="h-9"
              >
                <X className="mr-2 h-4 w-4" />
                Clear filters
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Products Table */}
      {!isLoading && filteredProducts.length === 0 ? (
        <EmptyState
          icon={<Archive />}
          title="No archived products"
          description="Archived products will appear here"
        />
      ) : !isLoading && (
        <Table noPagination={true}>
          <TableHeader>
            <TableRow isHeader>
              <TableHead>Image</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              {vendorsEnabled && <TableHead>Vendor</TableHead>}
              <TableHead>Created By</TableHead>
              <TableHead>Archived Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-warning/10 border border-warning/20">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name_en}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-warning" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-semibold max-w-xs">
                  <div className="flex flex-col">
                    <span className="truncate">{product.name_en}</span>
                    <span className="text-sm text-gray-500 truncate">{product.name_ar}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">{product.sku || "—"}</span>
                </TableCell>
                <TableCell>
                  <div>
                    {product.category?.name_en || <span className="text-gray-400">—</span>}
                  </div>
                </TableCell>
                {vendorsEnabled && (
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span>
                      {product.vendor?.name_en || <span className="text-gray-400">—</span>}
                    </span>
                    {product.vendor?.status === "archived" && (
                      <Badge variant="warning" className="w-fit text-xs">
                        Vendor Archived
                      </Badge>
                    )}
                  </div>
                </TableCell>
                )}
                <TableCell>
                  {product.created_by ? (
                    <div className="flex flex-col text-sm">
                      <span className="font-medium">
                        {[product.created_by.firstName, product.created_by.lastName].filter(Boolean).join(" ") || "Unknown Creator"}
                      </span>
                      {product.created_by.email && (
                        <span className="text-xs text-gray-500 truncate" title={product.created_by.email}>
                          {product.created_by.email}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-gray-500">{formatDate(product.archived_at)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <IconButton
                      variant="restore"
                      onClick={() => handleRestoreClick(product)}
                      title="Restore product"
                    />
                    <IconButton
                      variant="delete"
                      onClick={() => handleDeleteClick(product)}
                      title="Delete permanently"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Restore Confirmation Modal */}
      <RestoreConfirmationModal
        isOpen={restoreModalOpen}
        onClose={() => {
          setRestoreModalOpen(false);
          setProductToRestore(null);
        }}
        onConfirm={handleRestoreConfirm}
        variant="product"
        item={productToRestore}
        isLoading={restoreProduct.isPending}
      />

      {/* Permanent Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Permanently Delete Product"
        message="This action cannot be undone. This will permanently delete the product and all associated data."
        itemName={productToDelete?.name_en}
        confirmText="Delete Permanently"
        isLoading={permanentDeleteProduct.isPending}
        isPermanent
      />
    </div>
  );
}
