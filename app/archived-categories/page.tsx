"use client";

/**
 * Archived Categories Page
 * Page component for displaying and managing archived categories
 */

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "../src/providers/loading-provider";
import {
  useArchivedCategories,
  useRestoreCategory,
  usePermanentDeleteCategory,
  useCategories,
} from "../src/services/categories/hooks/use-categories";
import { Archive, Folder, RefreshCw, AlertCircle, X, Package, FolderTree } from "lucide-react";
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
import { CategoryRestoreModal } from "../src/components/categories/CategoryRestoreModal";
import { CategoryDeleteModal } from "../src/components/categories/CategoryDeleteModal";
import { Category, RestoreCategoryDto, PermanentDeleteCategoryDto } from "../src/services/categories/types/category.types";

export default function ArchivedCategoriesPage() {
  const router = useRouter();
  const { setShowOverlay } = useLoading();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [categoryToRestore, setCategoryToRestore] = useState<Category | null>(null);

  const { data: categories, isLoading, isError, error, refetch } = useArchivedCategories();
  const { data: allCategories } = useCategories();
  const restoreCategory = useRestoreCategory();
  const permanentDeleteCategory = usePermanentDeleteCategory();

  // Show loading overlay while data is loading
  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!categories || !Array.isArray(categories)) return [];
    if (!searchTerm) return categories;

    const term = searchTerm.toLowerCase();
    return categories.filter(
      (cat) =>
        cat.name_en.toLowerCase().includes(term) ||
        cat.name_ar.includes(searchTerm) ||
        cat.id.toString().includes(term)
    );
  }, [categories, searchTerm]);

  const handleRestoreClick = (category: Category) => {
    setCategoryToRestore(category);
    setRestoreModalOpen(true);
  };

  const handleRestoreConfirm = async (data: RestoreCategoryDto) => {
    if (categoryToRestore) {
      try {
        await restoreCategory.mutateAsync({ id: categoryToRestore.id, data });
        setRestoreModalOpen(false);
        setCategoryToRestore(null);
      } catch (error) {
        console.error("Failed to restore category:", error);
      }
    }
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (data: PermanentDeleteCategoryDto) => {
    if (categoryToDelete) {
      try {
        await permanentDeleteCategory.mutateAsync({ id: categoryToDelete.id, data });
        setDeleteModalOpen(false);
        setCategoryToDelete(null);
      } catch (error) {
        console.error("Failed to permanently delete category:", error);
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
              <h3 className="text-xl font-bold mt-4">Error Loading Archived Categories</h3>
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
        title="Archived Categories"
        description="Manage archived categories - restore or permanently delete"
        iconBgColor="bg-danger"
        action={{
          label: "View Active Categories",
          onClick: () => router.push("/categories"),
        }}
      />

      {/* Filters */}
      {(filteredCategories.length > 0 || hasActiveFilters) && (
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

      {/* Categories Table */}
      {!isLoading && filteredCategories.length === 0 ? (
        <EmptyState
          icon={<Archive />}
          title="No archived categories"
          description="Archived categories will appear here"
        />
      ) : !isLoading && (
        <Table noPagination={true}>
          <TableHeader>
            <TableRow isHeader>
              <TableHead>Image</TableHead>
              <TableHead>Name (English)</TableHead>
              <TableHead>Name (Arabic)</TableHead>
              <TableHead>Contents</TableHead>
              <TableHead>Archived Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div className="flex items-center justify-start">
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.name_en}
                        className="w-12 h-12 rounded-lg object-cover border border-warning/20"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
                        <Folder className="w-5 h-5 text-warning" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{category.name_en}</span>
                </TableCell>
                <TableCell>
                  <span dir="rtl">{category.name_ar}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {(category.archivedProducts?.length || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full w-fit">
                        <Package className="w-3 h-3" />
                        {category.archivedProducts?.length} products
                      </span>
                    )}
                    {(category.archivedSubcategories?.length || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full w-fit">
                        <FolderTree className="w-3 h-3" />
                        {category.archivedSubcategories?.length} subcategories
                      </span>
                    )}
                    {(category.archivedProducts?.length || 0) === 0 && (category.archivedSubcategories?.length || 0) === 0 && (
                      <span className="text-xs text-gray-400">No contents</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-gray-500">{formatDate(category.archived_at)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <IconButton
                      variant="restore"
                      onClick={() => handleRestoreClick(category)}
                      title="Restore category"
                    />
                    <IconButton
                      variant="delete"
                      onClick={() => handleDeleteClick(category)}
                      title="Delete permanently"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Restore Modal with Product/Subcategory Selection */}
      <CategoryRestoreModal
        isOpen={restoreModalOpen}
        onClose={() => {
          setRestoreModalOpen(false);
          setCategoryToRestore(null);
        }}
        onConfirm={handleRestoreConfirm}
        category={categoryToRestore}
        allCategories={allCategories || []}
        isLoading={restoreCategory.isPending}
      />

      {/* Permanent Delete Modal */}
      <CategoryDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        category={categoryToDelete}
        allCategories={allCategories || []}
        isLoading={permanentDeleteCategory.isPending}
      />
    </div>
  );
}
