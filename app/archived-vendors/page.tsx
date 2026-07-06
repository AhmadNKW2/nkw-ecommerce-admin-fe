"use client";

/**
 * Archived Vendors Page
 * Page component for displaying and managing archived vendors
 */

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "../src/providers/loading-provider";
import {
  useArchivedVendors,
  useRestoreVendor,
  usePermanentDeleteVendor,
  useVendors,
} from "../src/services/vendors/hooks/use-vendors";
import { Archive, Building2, RefreshCw, AlertCircle, X, Package } from "lucide-react";
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
import { VendorRestoreModal } from "../src/components/vendors/VendorRestoreModal";
import { VendorDeleteModal } from "../src/components/vendors/VendorDeleteModal";
import { Vendor, RestoreVendorDto, PermanentDeleteVendorDto } from "../src/services/vendors/types/vendor.types";

export default function ArchivedVendorsPage() {
  const router = useRouter();
  const { setShowOverlay } = useLoading();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [vendorToRestore, setVendorToRestore] = useState<Vendor | null>(null);

  const { data: vendors, isLoading, isError, error, refetch } = useArchivedVendors();
  const { data: allVendorsData } = useVendors();
  const allVendors = allVendorsData?.data;
  const restoreVendor = useRestoreVendor();
  const permanentDeleteVendor = usePermanentDeleteVendor();

  // Show loading overlay while data is loading
  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  // Filter vendors based on search
  const filteredVendors = useMemo(() => {
    if (!vendors || !Array.isArray(vendors)) return [];
    if (!searchTerm) return vendors;

    const term = searchTerm.toLowerCase();
    return vendors.filter(
      (vendor) =>
        vendor.name_en.toLowerCase().includes(term) ||
        vendor.name_ar.includes(searchTerm) ||
        vendor.id.toString().includes(term)
    );
  }, [vendors, searchTerm]);

  const handleRestoreClick = (vendor: Vendor) => {
    setVendorToRestore(vendor);
    setRestoreModalOpen(true);
  };

  const handleRestoreConfirm = async (data: RestoreVendorDto) => {
    if (vendorToRestore) {
      try {
        await restoreVendor.mutateAsync({ id: vendorToRestore.id, data });
        setRestoreModalOpen(false);
        setVendorToRestore(null);
      } catch (error) {
        console.error("Failed to restore vendor:", error);
      }
    }
  };

  const handleDeleteClick = (vendor: Vendor) => {
    setVendorToDelete(vendor);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (data: PermanentDeleteVendorDto) => {
    if (vendorToDelete) {
      try {
        await permanentDeleteVendor.mutateAsync({ id: vendorToDelete.id, data });
        setDeleteModalOpen(false);
        setVendorToDelete(null);
      } catch (error) {
        console.error("Failed to permanently delete vendor:", error);
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
              <h3 className="text-xl font-bold mt-4">Error Loading Archived Vendors</h3>
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
        title="Archived Vendors"
        description="Manage archived vendors - restore or permanently delete"
        iconBgColor="bg-danger"
        action={{
          label: "View Active Vendors",
          onClick: () => router.push("/vendors"),
        }}
      />

      {/* Filters */}
      {(filteredVendors.length > 0 || hasActiveFilters) && (
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

      {/* Vendors Table */}
      {!isLoading && filteredVendors.length === 0 ? (
        <EmptyState
          icon={<Archive />}
          title="No archived vendors"
          description="Archived vendors will appear here"
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
            {filteredVendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell>
                  <div className="flex items-center justify-start">
                    {vendor.logo ? (
                      <img
                        src={vendor.logo}
                        alt={vendor.name_en}
                        className="w-12 h-12 rounded-lg object-cover border border-warning/20"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-warning" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{vendor.name_en}</span>
                </TableCell>
                <TableCell>
                  <span dir="rtl">{vendor.name_ar}</span>
                </TableCell>
                <TableCell>
                  {(vendor.archivedProducts?.length || 0) > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      <Package className="w-3 h-3" />
                      {vendor.archivedProducts?.length} products
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">No products</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-gray-500">{formatDate(vendor.archived_at)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <IconButton
                      variant="restore"
                      onClick={() => handleRestoreClick(vendor)}
                      title="Restore vendor"
                    />
                    <IconButton
                      variant="delete"
                      onClick={() => handleDeleteClick(vendor)}
                      title="Delete permanently"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Restore Modal with Product Selection */}
      <VendorRestoreModal
        isOpen={restoreModalOpen}
        onClose={() => {
          setRestoreModalOpen(false);
          setVendorToRestore(null);
        }}
        onConfirm={handleRestoreConfirm}
        vendor={vendorToRestore}
        isLoading={restoreVendor.isPending}
      />

      {/* Permanent Delete Modal */}
      <VendorDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setVendorToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        vendor={vendorToDelete}
        allVendors={allVendors || []}
        isLoading={permanentDeleteVendor.isPending}
      />
    </div>
  );
}
