"use client";

/**
 * Specifications Page
 * Main page component for displaying and managing specifications
 */

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "../src/providers/loading-provider";
import { useCategories } from "../src/services/categories/hooks/use-categories";
import {
  useSpecifications,
  useDeleteSpecification,
  useReorderSpecifications,
} from "../src/services/specifications/hooks/use-specifications";
import { Tag, RefreshCw, AlertCircle, X, GripVertical } from "lucide-react";
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
import { SpecificationViewModal } from "../src/components/specifications/SpecificationViewModal";
import { CategoryTreeSelect } from "../src/components/products/CategoryTreeSelect";
import { Specification } from "../src/services/specifications/types/specification.types";
import {
  ALL_CATEGORIES_LABEL,
  buildCategoryNameMap,
  getEntityCategoryLabels,
} from "../src/lib/category-display";

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

// Sortable Row Component
const SortableRow: React.FC<{
  specification: Specification;
  categoryLabels: string[];
  displayIndex: number;
  onView: (specification: Specification) => void;
  onEdit: (specification: Specification) => void;
  onDelete: (specification: Specification) => void;
}> = ({ specification, categoryLabels, displayIndex, onView, onEdit, onDelete }) => {
  const {
    attributes: dndAttributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: specification.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: "transform 250ms cubic-bezier(0.25, 1, 0.5, 1), opacity 200ms ease",
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? 'relative' : undefined,
  };

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style}
      className={isDragging ? 'bg-primary/5 shadow-lg ring-2 ring-primary rounded-lg' : ''}
    >
      <TableCell className="w-12">
        <div
          className={`cursor-grab active:cursor-grabbing p-2 rounded-lg transition-all duration-200 inline-flex ${
            isDragging 
              ? 'bg-primary/20 shadow-sm' 
              : 'hover:bg-primary/10 hover:shadow-sm'
          }`}
          {...dndAttributes}
          {...listeners}
        >
          <GripVertical className={`h-5 w-5 transition-colors duration-200 ${
            isDragging ? 'text-primary' : 'text-primary/50'
          }`} />
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm text-gray-500">{displayIndex}</TableCell>
      <TableCell className="font-semibold">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span>{specification.name_en}</span>
            <span className="text-sm text-gray-500">
              {specification.name_ar}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {categoryLabels.length > 0 ? (
          <div className="flex max-w-md flex-wrap gap-1">
            {categoryLabels.map((label) => (
              <Badge key={`${specification.id}-${label}`} variant="default">
                {label}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-500">No categories</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={specification.is_active ? "success" : "danger"}>
          {specification.is_active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <IconButton
            variant="view"
            onClick={(e) => {
              e.stopPropagation();
              onView(specification);
            }}
            title="View specification"
          />
          <IconButton
            variant="edit"
            href={`/specifications/${specification.id}`}
            onClick={(e) => {
              e.stopPropagation();
            }}
            title="Edit specification"
          />
          <IconButton
            variant="delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(specification);
            }}
            title="Delete specification"
          />
        </div>
      </TableCell>
    </TableRow>
  );
};

export default function SpecificationsPage() {
  const router = useRouter();
  const { setShowOverlay } = useLoading();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [specificationToDelete, setSpecificationToDelete] = useState<Specification | null>(
    null
  );
  const [specificationToView, setSpecificationToView] = useState<Specification | null>(
    null
  );

  const categoryIdsQuery = useMemo(() => {
    const uniqueIds = Array.from(new Set(selectedCategoryIds.filter(Boolean)));
    return uniqueIds.length > 0 ? uniqueIds.join(",") : undefined;
  }, [selectedCategoryIds]);

  const { data: categories = [] } = useCategories();
  const { data: specifications, isLoading, isError, error, refetch } = useSpecifications(
    categoryIdsQuery ? { category_ids: categoryIdsQuery } : undefined
  );
  const deleteSpecification = useDeleteSpecification();

  // Show loading overlay while data is loading
  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);
  const reorderSpecifications = useReorderSpecifications();

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

  // Sort specifications by sort_order
  const sortedSpecifications = useMemo(() => {
    if (!specifications || !Array.isArray(specifications)) return [];
    return [...specifications].sort((a, b) => a.sort_order - b.sort_order);
  }, [specifications]);

  const categoryNameMap = useMemo(() => buildCategoryNameMap(categories), [categories]);

  // Filter specifications based on search
  const filteredSpecifications = useMemo(() => {
    if (!searchTerm) return sortedSpecifications;
    const term = searchTerm.toLowerCase();
    return sortedSpecifications.filter(
      (attr) =>
        attr.name_en.toLowerCase().includes(term) ||
        attr.name_ar.includes(searchTerm)
    );
  }, [sortedSpecifications, searchTerm]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredSpecifications.findIndex(
        (item) => item.id === active.id
      );
      const newIndex = filteredSpecifications.findIndex(
        (item) => item.id === over.id
      );

      const newOrder = arrayMove(filteredSpecifications, oldIndex, newIndex);
      const orders = newOrder.map((item, index) => ({
        id: item.id,
        sort_order: index,
      }));

      reorderSpecifications.mutate(orders);
    }
  };

  const handleView = (specification: Specification) => {
    setSpecificationToView(specification);
    setViewModalOpen(true);
  };

  const handleEdit = (specification: Specification) => {
    router.push(`/specifications/${specification.id}`);
  };

  const handleViewEdit = () => {
    if (specificationToView) {
      setViewModalOpen(false);
      router.push(`/specifications/${specificationToView.id}`);
    }
  };

  const handleDeleteClick = (specification: Specification) => {
    setSpecificationToDelete(specification);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (specificationToDelete) {
      try {
        await deleteSpecification.mutateAsync(specificationToDelete.id);
        setDeleteModalOpen(false);
        setSpecificationToDelete(null);
      } catch (error) {
        console.error("Failed to delete specification:", error);
      }
    }
  };

  const handleCreateNew = () => {
    router.push("/specifications/create");
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleCategoryChange = (ids: string[]) => {
    setSelectedCategoryIds(ids);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategoryIds([]);
  };

  const hasActiveFilters = !!searchTerm || selectedCategoryIds.length > 0;

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
              <h3 className="text-xl font-bold ">Error Loading Specifications</h3>
              <p className=" max-w-md mx-auto">
                {error instanceof Error ? error.message : "An error occurred"}
              </p>
              <Button onClick={() => refetch()}>
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
        icon={<Tag />}
        title="Specifications"
        description="Manage your product specifications"
        action={{ label: "Create", onClick: handleCreateNew }}
      />

      {/* Filters */}
      {(filteredSpecifications.length > 0 || hasActiveFilters) && (
        <Card>
          <h2 className="text-lg font-semibold ">Filters</h2>
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <div className="relative flex-1 max-w-sm">
              <Input
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                label="Search"
                variant="search"
              />
            </div>

            <div className="relative z-50 flex-1">
              <CategoryTreeSelect
                label="Categories"
                categories={categories}
                selectedIds={selectedCategoryIds}
                onChange={handleCategoryChange}
                disabled={categories.length === 0}
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

      {/* Specifications Table */}
      {!isLoading && filteredSpecifications.length === 0 ? (
        <EmptyState
          icon={<Tag />}
          title="No specifications found"
          description="Try adjusting your filters or add new specifications"
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
          <Table noPagination={true}>
            <TableHeader>
              <TableRow isHeader>
                <TableHead className="w-12">{""}</TableHead>
                <TableHead className="w-12">#</TableHead>
                <TableHead >Specification Name</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext
                items={filteredSpecifications.map((attr) => attr.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredSpecifications.map((specification, index) => (
                  <SortableRow
                    key={specification.id}
                    specification={specification}
                    categoryLabels={specification.for_all_categories
                      ? [ALL_CATEGORIES_LABEL]
                      : getEntityCategoryLabels(
                          specification.category_ids,
                          specification.categories,
                          categoryNameMap
                        )}
                    displayIndex={index + 1}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSpecificationToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Specification"
        itemName={specificationToDelete?.name_en}
        isLoading={deleteSpecification.isPending}
      />

      {/* Specification View Modal */}
      <SpecificationViewModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSpecificationToView(null);
        }}
        specification={specificationToView}
        onEdit={handleViewEdit}
      />
    </div>
  );
}
