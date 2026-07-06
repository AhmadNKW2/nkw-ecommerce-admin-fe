"use client";

/**
 * Archived Brands Page
 * Mirrors archived vendors page with restore/delete flows
 */

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "../src/providers/loading-provider";
import {
  useArchivedBrands,
  useRestoreBrand,
  usePermanentDeleteBrand,
  useBrands,
} from "../src/services/brands/hooks/use-brands";
import { Archive, Tags, AlertCircle, X, Package } from "lucide-react";
import { Card } from "../src/components/ui/card";
import { Button } from "../src/components/ui/button";
import { IconButton } from "../src/components/ui/icon-button";
import { PageHeader } from "../src/components/common/PageHeader";
import { EmptyState } from "../src/components/common/EmptyState";
import { Input } from "../src/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../src/components/ui/table";
import { BrandRestoreModal } from "../src/components/brands/BrandRestoreModal";
import { BrandDeleteModal } from "../src/components/brands/BrandDeleteModal";
import { Brand, RestoreBrandDto, PermanentDeleteBrandDto } from "../src/services/brands/types/brand.types";

export default function ArchivedBrandsPage() {
  const router = useRouter();
  const { setShowOverlay } = useLoading();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [brandToRestore, setBrandToRestore] = useState<Brand | null>(null);

  const { data: brands, isLoading, isError, error, refetch } = useArchivedBrands();
  const { data: allBrandsData } = useBrands();
  const allBrands = allBrandsData?.data;
  const restoreBrand = useRestoreBrand();
  const permanentDeleteBrand = usePermanentDeleteBrand();

  // Show loading overlay while data is loading
  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  const filteredBrands = useMemo(() => {
    if (!brands || !Array.isArray(brands)) return [];
    if (!searchTerm) return brands;

    const term = searchTerm.toLowerCase();
    return brands.filter(
      (brand) =>
        brand.name_en.toLowerCase().includes(term) ||
        brand.name_ar.includes(searchTerm) ||
        brand.id.toString().includes(term)
    );
  }, [brands, searchTerm]);

  const handleRestoreClick = (brand: Brand) => {
    setBrandToRestore(brand);
    setRestoreModalOpen(true);
  };

  const handleRestoreConfirm = async (data: RestoreBrandDto) => {
    if (brandToRestore) {
      try {
        await restoreBrand.mutateAsync({ id: brandToRestore.id, data });
        setRestoreModalOpen(false);
        setBrandToRestore(null);
      } catch (err) {
        console.error("Failed to restore brand:", err);
      }
    }
  };

  const handleDeleteClick = (brand: Brand) => {
    setBrandToDelete(brand);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (data: PermanentDeleteBrandDto) => {
    if (brandToDelete) {
      try {
        await permanentDeleteBrand.mutateAsync({ id: brandToDelete.id, data });
        setDeleteModalOpen(false);
        setBrandToDelete(null);
      } catch (err) {
        console.error("Failed to permanently delete brand:", err);
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
      <div className="admin-state-page">
        <div className="mx-auto">
          <Card>
            <div className="p-12 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-danger/10 p-3">
                  <AlertCircle className="h-8 w-8 text-danger" />
                </div>
              </div>
              <h3 className="text-xl font-bold mt-4">Error Loading Archived Brands</h3>
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
    <div className="admin-page">
      <PageHeader
        icon={<Archive />}
        title="Archived Brands"
        description="Manage archived brands - restore or permanently delete"
        iconBgColor="bg-danger"
        action={{
          label: "View Active Brands",
          onClick: () => router.push("/brands"),
        }}
      />

      {(filteredBrands.length > 0 || hasActiveFilters) && (
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

      {!isLoading && filteredBrands.length === 0 ? (
        <EmptyState
          icon={<Archive />}
          title="No archived brands"
          description="Archived brands will appear here"
        />
      ) : !isLoading && (
        <Table noPagination={true}>
          <TableHeader>
            <TableRow isHeader>
              <TableHead>Logo</TableHead>
              <TableHead>Name (English)</TableHead>
              <TableHead>Name (Arabic)</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Archived Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBrands.map((brand) => (
              <TableRow key={brand.id}>
                <TableCell>
                  <div className="flex items-center justify-start">
                    {brand.logo ? (
                      <img
                        src={brand.logo}
                        alt={brand.name_en}
                        className="w-12 h-12 rounded-lg object-cover border border-warning/20"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
                        <Tags className="w-5 h-5 text-warning" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{brand.name_en}</span>
                </TableCell>
                <TableCell>
                  <span dir="rtl">{brand.name_ar}</span>
                </TableCell>
                <TableCell>
                  {(brand.archivedProducts?.length || 0) > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      <Package className="w-3 h-3" />
                      {brand.archivedProducts?.length} products
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">No products</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-gray-500">{formatDate(brand.archived_at)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <IconButton
                      variant="restore"
                      onClick={() => handleRestoreClick(brand)}
                      title="Restore brand"
                    />
                    <IconButton
                      variant="delete"
                      onClick={() => handleDeleteClick(brand)}
                      title="Delete permanently"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <BrandRestoreModal
        isOpen={restoreModalOpen}
        onClose={() => setRestoreModalOpen(false)}
        onConfirm={handleRestoreConfirm}
        brand={brandToRestore}
        isLoading={restoreBrand.isPending}
      />

      <BrandDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        brand={brandToDelete}
        allBrands={allBrands}
        isLoading={permanentDeleteBrand.isPending}
      />
    </div>
  );
}
