"use client";

/**
 * Categories Page
 * Main page component for displaying and managing categories
 */

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "../src/providers/loading-provider";
import {
  useCategories,
  useDeleteCategory,
  useReorderCategories,
} from "../src/services/categories/hooks/use-categories";
import { Folder, RefreshCw, AlertCircle, X } from "lucide-react";
import { Card } from "../src/components/ui/card";
import { Button } from "../src/components/ui/button";
import { PageHeader } from "../src/components/common/PageHeader";
import { EmptyState } from "../src/components/common/EmptyState";
import { Input } from "../src/components/ui/input";
import { DeleteConfirmationModal } from "../src/components/common/DeleteConfirmationModal";
import { CategoryViewModal } from "../src/components/categories/CategoryViewModal";
import CategoryAccordion from "../src/components/categories/CategoryAccordion";
import { Category } from "../src/services/categories/types/category.types";

const findCategoryById = (
  categories: Category[] | undefined,
  id: number
): Category | null => {
  if (!categories) return null;

  for (const category of categories) {
    if (category.id === id) {
      return category;
    }

    const nestedMatch = findCategoryById(category.children, id);
    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
};

export default function CategoriesPage() {
  const router = useRouter();
  const { setShowOverlay } = useLoading();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [categoryToView, setCategoryToView] = useState<Category | null>(null);

  const { data: categories, isLoading, isError, error, refetch } = useCategories();
  const deleteCategory = useDeleteCategory();
  const reorderCategories = useReorderCategories();

  // Show loading overlay while data is loading
  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!categories || !Array.isArray(categories)) return [];
    if (!searchTerm) return categories;
    
    const term = searchTerm.toLowerCase();
    
    const filterRecursive = (cats: Category[]): Category[] => {
      return cats.reduce((acc, cat) => {
        const matches = 
          cat.name_en.toLowerCase().includes(term) ||
          cat.name_ar.includes(searchTerm) ||
          cat.id.toString().includes(term);
        
        const filteredChildren = cat.children ? filterRecursive(cat.children) : [];
        
        if (matches || filteredChildren.length > 0) {
          acc.push({
            ...cat,
            children: filteredChildren
          });
        }
        
        return acc;
      }, [] as Category[]);
    };

    return filterRecursive(categories);
  }, [categories, searchTerm]);

  // Get parent category for view modal
  const parentCategory = useMemo(() => {
    if (!categoryToView?.parent_id || !categories) return null;
    return findCategoryById(categories, categoryToView.parent_id);
  }, [categoryToView, categories]);

  const handleView = (category: Category) => {
    setCategoryToView(category);
    setViewModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    router.push(`/categories/${category.id}`);
  };

  const handleViewEdit = () => {
    if (categoryToView) {
      setViewModalOpen(false);
      router.push(`/categories/${categoryToView.id}`);
    }
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (categoryToDelete) {
      try {
        await deleteCategory.mutateAsync(categoryToDelete.id);
        setDeleteModalOpen(false);
        setCategoryToDelete(null);
      } catch (error) {
        console.error("Failed to delete category:", error);
      }
    }
  };

  const handleCreateNew = () => {
    router.push("/categories/create");
  };

  const handleReorder = (reorderedCategories: { id: number; sortOrder: number; parentId: number | null }[]) => {
    // Transform to API format (only id and sortOrder)
    const categoriesData = reorderedCategories.map(({ id, sortOrder }) => ({
      id,
      sortOrder,
    }));
    
    reorderCategories.mutate({ categories: categoriesData });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
  };

  const hasActiveFilters = !!searchTerm;

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
              <h3 className="text-xl font-bold mt-4">Error Loading Categories</h3>
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
        icon={<Folder />}
        title="Categories"
        description="Manage your product categories"
        action={{ label: "Create", onClick: handleCreateNew }}
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

      {/* Categories Accordion */}
      {!isLoading && filteredCategories.length === 0 ? (
        <EmptyState
          icon={<Folder />}
          title="No categories found"
          description="Try adjusting your filters or add new categories"
        />
      ) : !isLoading && (
        <Card>
          <CategoryAccordion
            categories={filteredCategories}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onReorder={handleReorder}
          />
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        itemName={categoryToDelete?.name_en}
        isLoading={deleteCategory.isPending}
      />

      {/* Category View Modal */}
      <CategoryViewModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setCategoryToView(null);
        }}
        category={categoryToView}
        onEdit={handleViewEdit}
        parentCategory={parentCategory}
      />
    </div>
  );
}
