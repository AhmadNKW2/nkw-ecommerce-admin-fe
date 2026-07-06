"use client";

/**
 * Brands Page
 * Main page component for displaying and managing brands (mirrors vendors page)
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "../src/providers/loading-provider";
import {
  useBrands,
  useArchiveBrand,
  useReorderBrands,
} from "../src/services/brands/hooks/use-brands";
import { Tags, RefreshCw, AlertCircle, X, GripVertical } from "lucide-react";
import { Card } from "../src/components/ui/card";
import { Button } from "../src/components/ui/button";
import { PageHeader } from "../src/components/common/PageHeader";
import { EmptyState } from "../src/components/common/EmptyState";
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
import { BrandViewModal } from "../src/components/brands/BrandViewModal";
import { Brand } from "../src/services/brands/types/brand.types";

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

interface SortableBrandRowProps {
  brand: Brand;
  displayIndex: number;
  onView: (brand: Brand) => void;
  onEdit: (brand: Brand) => void;
  onDelete: (brand: Brand) => void;
}

const SortableBrandRow: React.FC<SortableBrandRowProps> = ({
  brand,
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
  } = useSortable({ id: brand.id });

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
          {brand.logo ? (
            <img
              src={brand.logo}
              alt={brand.name_en}
              className="w-12 h-12 rounded-lg object-cover border border-primary/20"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Tags className="w-5 h-5 text-primary" />
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
        <Badge variant={brand.visible ? "success" : "danger"}>
          {brand.visible ? "Visible" : "Hidden"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <IconButton
            variant="view"
            onClick={(e) => {
              e.stopPropagation();
              onView(brand);
            }}
            title="View brand"
          />
          <IconButton
            variant="edit"
            href={`/brands/${brand.id}`}
            onClick={(e) => {
              e.stopPropagation();
            }}
            title="Edit brand"
          />
          <IconButton
            variant="delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(brand);
            }}
            title="Archive brand"
          />
        </div>
      </TableCell>
    </TableRow>
  );
};

export default function BrandsPage() {
  const router = useRouter();
  const { setShowOverlay } = useLoading();
  const [searchTerm, setSearchTerm] = useState("");
  const [queryParams, setQueryParams] = useState({ page: 1, limit: 10, search: "" });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [brandToView, setBrandToView] = useState<Brand | null>(null);

  const { data, isLoading, isError, error, refetch } = useBrands(queryParams);
  const archiveBrand = useArchiveBrand();
  const reorderBrands = useReorderBrands();

  const brands = data?.data ?? [];
  const meta = data?.meta;

  // Show loading overlay while data is loading
  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  const [orderedBrands, setOrderedBrands] = useState<Brand[]>([]);

  useEffect(() => {
    if (brands) {
      setOrderedBrands(brands);
    }
  }, [data]);

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
      const oldIndex = orderedBrands.findIndex((b) => b.id === active.id);
      const newIndex = orderedBrands.findIndex((b) => b.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(orderedBrands, oldIndex, newIndex);
        setOrderedBrands(newOrder);

        const reorderData = newOrder.map((brand, index) => ({
          id: brand.id,
          sort_order: index,
        }));
        reorderBrands.mutate({ brands: reorderData });
      }
    }
  }, [orderedBrands, reorderBrands]);

  const handleView = (brand: Brand) => {
    setBrandToView(brand);
    setViewModalOpen(true);
  };

  const handleEdit = (brand: Brand) => {
    router.push(`/brands/${brand.id}`);
  };

  const handleViewEdit = () => {
    if (brandToView) {
      setViewModalOpen(false);
      router.push(`/brands/${brandToView.id}`);
    }
  };

  const handleDeleteClick = (brand: Brand) => {
    setBrandToDelete(brand);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (brandToDelete) {
      try {
        await archiveBrand.mutateAsync(brandToDelete.id);
        setDeleteModalOpen(false);
        setBrandToDelete(null);
      } catch (err) {
        console.error("Failed to archive brand:", err);
      }
    }
  };

  const handleCreateNew = () => {
    router.push("/brands/create");
  };

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setQueryParams((prev) => ({ ...prev, search: value, page: 1 }));
    }, 400);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setQueryParams((prev) => ({ ...prev, search: "", page: 1 }));
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
              <h3 className="text-xl font-bold mt-4">Error Loading Brands</h3>
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
        icon={<Tags />}
        title="Brands"
        description="Manage your product brands"
        action={{ label: "Create", onClick: handleCreateNew }}
      />

      {(orderedBrands.length > 0 || hasActiveFilters) && (
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

      {!isLoading && orderedBrands.length === 0 ? (
        <EmptyState
          icon={<Tags />}
          title="No brands found"
          description="Try adjusting your filters or add new brands"
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
            items={orderedBrands.map((b) => b.id)}
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
                  <TableHead className="w-12"> </TableHead>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Logo</TableHead>
                  <TableHead>Name (English)</TableHead>
                  <TableHead>Name (Arabic)</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedBrands.map((brand, index) => (
                  <SortableBrandRow
                    key={brand.id}
                    brand={brand}
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

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Archive Brand"
        message="Are you sure you want to archive this brand?"
        isLoading={archiveBrand.isPending}
      />

      <BrandViewModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        brand={brandToView}
        onEdit={handleViewEdit}
      />
    </div>
  );
}
