"use client";

/**
 * Vendors Page
 * Main page component for displaying and managing vendors
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "../src/providers/loading-provider";
import {
  useVendors,
  useArchiveVendor,
  useReorderVendors,
} from "../src/services/vendors/hooks/use-vendors";
import { Building2, RefreshCw, AlertCircle, GripVertical } from "lucide-react";
import { Card } from "../src/components/ui/card";
import { Button } from "../src/components/ui/button";
import { PageHeader } from "../src/components/common/PageHeader";
import { EmptyState } from "../src/components/common/EmptyState";
import { FiltersCard } from "../src/components/common/FiltersCard";
import { Input } from "../src/components/ui/input";
import { Badge } from "../src/components/ui/badge";
import { IconButton } from "../src/components/ui/icon-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../src/components/ui/table";
import { DeleteConfirmationModal } from "../src/components/common/DeleteConfirmationModal";
import { VendorViewModal } from "../src/components/vendors/VendorViewModal";
import { Vendor } from "../src/services/vendors/types/vendor.types";

// DnD Kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ============================================
// Sortable Vendor Row Component
// ============================================
interface SortableVendorRowProps {
  vendor: Vendor;
  displayIndex: number;
  onView: (vendor: Vendor) => void;
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendor: Vendor) => void;
}

const SortableVendorRow: React.FC<SortableVendorRowProps> = ({
  vendor,
  displayIndex,
  onView,
  onEdit,
  onDelete,
}) => {
  const {
    attributes: dndAttributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: vendor.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: "transform 250ms cubic-bezier(0.25, 1, 0.5, 1), opacity 200ms ease",
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? "relative" : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={isDragging ? "bg-primary/5 shadow-lg ring-2 ring-primary" : ""}
    >
      <TableCell>
        <div
          className={`cursor-grab active:cursor-grabbing p-2 rounded-lg transition-all duration-200 inline-flex ${
            isDragging
              ? "bg-primary/20 shadow-sm"
              : "hover:bg-primary/10 hover:shadow-sm"
          }`}
          {...dndAttributes}
          {...listeners}
        >
          <GripVertical
            className={`h-5 w-5 transition-colors duration-200 ${
              isDragging ? "text-primary" : "text-primary/50"
            }`}
          />
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm text-gray-500 w-12 text-center">
        {displayIndex}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-start">
          {vendor.logo ? (
            <img
              src={vendor.logo}
              alt={vendor.name_en}
              className="w-12 h-12 rounded-lg object-cover border border-primary/20"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
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
        <Badge variant={vendor.visible ? "success" : "danger"}>
          {vendor.visible ? "Visible" : "Hidden"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <IconButton
            variant="view"
            onClick={(e) => {
              e.stopPropagation();
              onView(vendor);
            }}
            title="View vendor"
          />
          <IconButton
            variant="edit"
            href={`/vendors/${vendor.id}`}
            onClick={(e) => {
              e.stopPropagation();
            }}
            title="Edit vendor"
          />
          <IconButton
            variant="delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(vendor);
            }}
            title="Archive vendor"
          />
        </div>
      </TableCell>
    </TableRow>
  );
};

export default function VendorsPage() {
  const router = useRouter();
  const { setShowOverlay } = useLoading();
  const [searchTerm, setSearchTerm] = useState("");
  const [queryParams, setQueryParams] = useState({ page: 1, limit: 10, search: "" });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [vendorToView, setVendorToView] = useState<Vendor | null>(null);

  const { data, isLoading, isError, error, refetch } = useVendors(queryParams);
  const archiveVendor = useArchiveVendor();
  const reorderVendors = useReorderVendors();

  const vendors = data?.data ?? [];
  const meta = data?.meta;

  // Show loading overlay while data is loading
  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  // Local state for ordered vendors
  const [orderedVendors, setOrderedVendors] = useState<Vendor[]>([]);

  // Update ordered vendors when data changes
  useEffect(() => {
    if (vendors) {
      setOrderedVendors(vendors);
    }
  }, [data]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedVendors.findIndex((v) => v.id === active.id);
      const newIndex = orderedVendors.findIndex((v) => v.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(orderedVendors, oldIndex, newIndex);
        setOrderedVendors(newOrder);

        // Call API to persist the order
        const reorderData = newOrder.map((vendor, index) => ({
          id: vendor.id,
          sort_order: index,
        }));
        reorderVendors.mutate({ vendors: reorderData });
      }
    }
  }, [orderedVendors, reorderVendors]);

  const handleView = (vendor: Vendor) => {
    setVendorToView(vendor);
    setViewModalOpen(true);
  };

  const handleEdit = (vendor: Vendor) => {
    router.push(`/vendors/${vendor.id}`);
  };

  const handleViewEdit = () => {
    if (vendorToView) {
      setViewModalOpen(false);
      router.push(`/vendors/${vendorToView.id}`);
    }
  };

  const handleDeleteClick = (vendor: Vendor) => {
    setVendorToDelete(vendor);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (vendorToDelete) {
      try {
        await archiveVendor.mutateAsync(vendorToDelete.id);
        setDeleteModalOpen(false);
        setVendorToDelete(null);
      } catch (error) {
        console.error("Failed to archive vendor:", error);
      }
    }
  };

  const handleCreateNew = () => {
    router.push("/vendors/create");
  };

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setQueryParams((prev) => ({ ...prev, search: value, page: 1 }));
    }, 400);
  };

  const handlePageChange = (page: number) => {
    setQueryParams((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setQueryParams((prev) => ({ ...prev, limit: pageSize, page: 1 }));
  };

  const hasActiveFilters = !!queryParams.search;

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
              <h3 className="text-xl font-bold mt-4">Error Loading Vendors</h3>
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
        icon={<Building2 />}
        title="Vendors"
        description="Manage your product vendors"
        action={{ label: "Create", onClick: handleCreateNew }}
      />

      {/* Filters */}
      {(orderedVendors.length > 0 || hasActiveFilters) && (
        <FiltersCard>
          <div className="flex items-center gap-5">
            <div className="relative flex-1 max-w-sm">
              <Input
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                label="Search"
                variant="search"
              />
            </div>
          </div>
        </FiltersCard>
      )}

      {/* Vendors Table */}
      {!isLoading && orderedVendors.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="No vendors found"
          description="Try adjusting your filters or add new vendors"
        />
      ) : !isLoading && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
        >
          <SortableContext
            items={orderedVendors.map((v) => v.id)}
            strategy={verticalListSortingStrategy}
          >
            <Table
              pagination={meta ? {
                currentPage: meta.page,
                pageSize: meta.limit,
                totalItems: meta.total,
                totalPages: meta.totalPages,
                hasNextPage: meta.page < meta.totalPages,
                hasPreviousPage: meta.page > 1,
              } : undefined}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            >
              <TableHeader>
                <TableRow isHeader>
                  <TableHead className="w-12">{""}</TableHead>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Logo</TableHead>
                  <TableHead>Name (English)</TableHead>
                  <TableHead>Name (Arabic)</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedVendors.map((vendor, index) => (
                  <SortableVendorRow
                    key={vendor.id}
                    vendor={vendor}
                    displayIndex={(meta ? (meta.page - 1) * meta.limit : 0) + index + 1}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </TableBody>
            </Table>
          </SortableContext>
        </DndContext>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setVendorToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Archive Vendor"
        message={`Are you sure you want to archive "${vendorToDelete?.name_en}"? This will also archive all products associated with this vendor.`}
        itemName={vendorToDelete?.name_en}
        isLoading={archiveVendor.isPending}
      />

      {/* Vendor View Modal */}
      <VendorViewModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setVendorToView(null);
        }}
        vendor={vendorToView}
        onEdit={handleViewEdit}
      />
    </div>
  );
}
