"use client";

/**
 * Edit Category Page
 */

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "../../src/providers/loading-provider";
import { useAttributes } from "../../src/services/attributes/hooks/use-attributes";
import {
  useCategory,
  useUpdateCategory,
  useCategories,
} from "../../src/services/categories/hooks/use-categories";
import { CategoryForm } from "../../src/components/categories/CategoryForm";
import { useSpecifications } from "../../src/services/specifications/hooks/use-specifications";
import { Card } from "../../src/components/ui/card";
import { Button } from "../../src/components/ui/button";
import { ImageUploadItem } from "../../src/components/ui/image-upload";
import { RefreshCw, AlertCircle } from "lucide-react";
import { validateCategoryForm } from "../../src/lib/validations";
import { ProductItem } from "../../src/components/common/ProductsTableSection";
import { mapProductToProductItem } from "../../src/components/common/product-table-utils";
import { buildUpdateProductChanges } from "@/lib/product-changes";
import { useResolvedFeatureToggles } from "../../src/hooks/use-resolved-feature-toggles";

const extractLinkedIds = (directIds: unknown, relations: unknown): number[] => {
  const normalizedIds = Array.isArray(directIds)
    ? directIds.filter((id): id is number => typeof id === "number")
    : [];

  const relationIds = Array.isArray(relations)
    ? relations
        .map((item) =>
          typeof item === "object" && item !== null && "id" in item ? (item as { id?: unknown }).id : undefined
        )
        .filter((id): id is number => typeof id === "number")
    : [];

  return [...new Set([...normalizedIds, ...relationIds])];
};

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = Number(params.id);
  const { setShowOverlay } = useLoading();
  const { isEnabled } = useResolvedFeatureToggles();
  const attributesEnabled = isEnabled("attributes_enabled");
  const specificationsEnabled = isEnabled("specifications_enabled");

  // Form state
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [metaTitleEn, setMetaTitleEn] = useState("");
  const [metaTitleAr, setMetaTitleAr] = useState("");
  const [metaDescriptionEn, setMetaDescriptionEn] = useState("");
  const [metaDescriptionAr, setMetaDescriptionAr] = useState("");
  const [image, setImage] = useState<ImageUploadItem | null>(null);
  const [visible, setVisible] = useState(true);
  const [parentId, setParentId] = useState<number | null>(null);
  const [product_ids, setProductIds] = useState<number[]>([]);
  const [attribute_ids, setAttributeIds] = useState<number[]>([]);
  const [specification_ids, setSpecificationIds] = useState<number[]>([]);
  const [copyFromCategoryId, setCopyFromCategoryId] = useState("");
  const [formErrors, setFormErrors] = useState<{
    name_en?: string;
    name_ar?: string;
    description_en?: string;
    description_ar?: string;
    image?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get the specific category
  const {
    data: category,
    isLoading,
    isError,
    error,
    refetch,
  } = useCategory(categoryId);

  const { data: attributes = [] } = useAttributes(undefined, {
    enabled: attributesEnabled,
  });
  const { data: allCategories } = useCategories();
  const { data: specifications = [] } = useSpecifications(undefined, {
    enabled: specificationsEnabled,
  });
  const sourceCategoryId = Number(copyFromCategoryId);
  const { data: sourceCategory } = useCategory(sourceCategoryId, {
    enabled: sourceCategoryId > 0,
  });

  const updateCategory = useUpdateCategory();

  // Get assigned products from category response
  const assignedProducts: ProductItem[] = useMemo(() => {
    const products = (category as any)?.products || [];
    return products.map((product: any) => mapProductToProductItem(product));
  }, [category]);

  const originalProductIds = useMemo(() => {
    const products = (category as any)?.products || [];
    return products.map((product: { id: number }) => product.id);
  }, [category]);

  // Initialize form when category loads
  useEffect(() => {
    if (category) {
      setNameEn(category.name_en);
      setNameAr(category.name_ar);
      setDescriptionEn(category.description_en || "");
      setDescriptionAr(category.description_ar || "");
      setMetaTitleEn(category.meta_title_en || "");
      setMetaTitleAr(category.meta_title_ar || "");
      setMetaDescriptionEn(category.meta_description_en || "");
      setMetaDescriptionAr(category.meta_description_ar || "");
      // Set existing image URL
      if (category.image) {
        setImage({
          id: `existing-${Date.now()}`,
          file: undefined,
          preview: category.image,
          type: "image",
          order: 0,
        });
      } else {
        setImage(null);
      }
      setVisible(category.visible ?? true);
      setParentId(category.parent_id || null);
      setAttributeIds(extractLinkedIds((category as any).attribute_ids, (category as any).attributes));
      setSpecificationIds(extractLinkedIds((category as any).specification_ids, (category as any).specifications));
      setCopyFromCategoryId("");
    }
  }, [category]);

  // Initialize product IDs from category response
  useEffect(() => {
    if (category && (category as any).products) {
      setProductIds((category as any).products.map((p: { id: number }) => p.id));
    }
  }, [category]);

  useEffect(() => {
    if (!copyFromCategoryId || !sourceCategory) {
      return;
    }

    setAttributeIds(
      attributesEnabled
        ? extractLinkedIds((sourceCategory as any).attribute_ids, (sourceCategory as any).attributes)
        : []
    );
    setSpecificationIds(
      specificationsEnabled
        ? extractLinkedIds((sourceCategory as any).specification_ids, (sourceCategory as any).specifications)
        : []
    );
  }, [copyFromCategoryId, sourceCategory, attributesEnabled, specificationsEnabled]);

  const validate = () => {
    const result = validateCategoryForm({
      name_en: nameEn,
      name_ar: nameAr,
      description_en: descriptionEn,
      description_ar: descriptionAr,
    });

    if (!result.isValid) {
      setFormErrors(result.errors);
      return false;
    }

    setFormErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await updateCategory.mutateAsync({
        id: categoryId,
        data: {
          name_en: nameEn,
          name_ar: nameAr,
          description_en: descriptionEn || undefined,
          description_ar: descriptionAr || undefined,
          meta_title_en: metaTitleEn || undefined,
          meta_title_ar: metaTitleAr || undefined,
          meta_description_en: metaDescriptionEn || undefined,
          meta_description_ar: metaDescriptionAr || undefined,
          visible: visible,
          parent_id: parentId,
          ...(attributesEnabled ? { attribute_ids } : {}),
          ...(specificationsEnabled ? { specification_ids } : {}),
          // Only send new file if one was uploaded
          image: image?.file || undefined,
          product_changes: buildUpdateProductChanges(originalProductIds, product_ids),
        },
      });

      router.push("/categories");
    } catch (error) {
      console.error("Failed to update category:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get available parent categories from the category response (assumes API includes this)
  const availableParents = (category as any)?.availableParents || [];

  // Show loading overlay while data is loading
  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  if (isLoading) {
    return null;
  }

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
              <h3 className="text-xl font-bold mt-4">Error Loading Category</h3>
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

  if (!category) {
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
              <h3 className="text-xl font-bold mt-4">Category Not Found</h3>
              <p className="mt-2 max-w-md mx-auto">
                The category you're looking for doesn't exist.
              </p>
              <Button onClick={() => router.push("/categories")} className="mt-4">
                Back to Categories
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <CategoryForm
      mode="edit"
      nameEn={nameEn}
      nameAr={nameAr}
      descriptionEn={descriptionEn}
      descriptionAr={descriptionAr}
      metaTitleEn={metaTitleEn}
      metaTitleAr={metaTitleAr}
      metaDescriptionEn={metaDescriptionEn}
      metaDescriptionAr={metaDescriptionAr}
      image={image}
      visible={visible}
      parentId={parentId}
      product_ids={product_ids}
      attributeIds={attribute_ids.map(String)}
      specificationIds={specification_ids.map(String)}
      copyFromCategoryId={copyFromCategoryId}
      onNameEnChange={(value) => {
        setNameEn(value);
        if (formErrors.name_en) {
          setFormErrors((prev) => ({ ...prev, name_en: undefined }));
        }
      }}
      onNameArChange={(value) => {
        setNameAr(value);
        if (formErrors.name_ar) {
          setFormErrors((prev) => ({ ...prev, name_ar: undefined }));
        }
      }}
      onDescriptionEnChange={(value) => {
        setDescriptionEn(value);
        if (formErrors.description_en) {
          setFormErrors((prev) => ({ ...prev, description_en: undefined }));
        }
      }}
      onDescriptionArChange={(value) => {
        setDescriptionAr(value);
        if (formErrors.description_ar) {
          setFormErrors((prev) => ({ ...prev, description_ar: undefined }));
        }
      }}
      onMetaTitleEnChange={setMetaTitleEn}
      onMetaTitleArChange={setMetaTitleAr}
      onMetaDescriptionEnChange={setMetaDescriptionEn}
      onMetaDescriptionArChange={setMetaDescriptionAr}
      onImageChange={setImage}
      onVisibleChange={setVisible}
      onParentIdChange={setParentId}
      onProductIdsChange={setProductIds}
      onAttributeIdsChange={(value) => setAttributeIds(value.map(Number))}
      onSpecificationIdsChange={(value) => setSpecificationIds(value.map(Number))}
      onCopyFromCategoryIdChange={setCopyFromCategoryId}
      formErrors={formErrors}
      parentCategories={allCategories || []}
      allAttributes={attributes}
      allSpecifications={specifications}
      assignedProducts={assignedProducts}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting || updateCategory.isPending}
      submitButtonText="Save Changes"
      currentCategoryId={categoryId}
    />
  );
}
