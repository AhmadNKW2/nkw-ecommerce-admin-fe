"use client";

/**
 * Specification Edit Page
 * Uses React Hook Form + Zod for validation
 * Values are managed locally and sent with specification update
 */

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/hooks/use-loading-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLoading } from "../../src/providers/loading-provider";
import { useCategories } from "../../src/services/categories/hooks/use-categories";
import {
  useSpecification,
  useSpecifications,
  useUpdateSpecification,
  useDeleteSpecificationValue,
} from "../../src/services/specifications/hooks/use-specifications";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Card } from "../../src/components/ui/card";
import { Button } from "../../src/components/ui/button";
import { DeleteConfirmationModal } from "../../src/components/common/DeleteConfirmationModal";
import { SpecificationValue, Specification } from "../../src/services/specifications/types/specification.types";
import { SpecificationForm } from "../../src/components/specifications/SpecificationForm";
import { specificationSchema, type SpecificationFormData, type SpecificationFormOutput } from "../../src/lib/validations/specification.schema";

const extractCategoryIds = (specification?: Specification | null): number[] => {
  if (!specification) {
    return [];
  }

  const directIds = Array.isArray(specification.category_ids) ? specification.category_ids : [];
  const relatedIds = Array.isArray(specification.categories)
    ? specification.categories
        .map((category) => category.id)
        .filter((categoryId): categoryId is number => typeof categoryId === "number")
    : [];

  return [...new Set([...directIds, ...relatedIds])];
};

export default function SpecificationEditPage() {
  const params = useParams();
  const specificationId = Number(params.id);
  const router = useRouter();
  const { setShowOverlay } = useLoading();

  // React Hook Form with Zod
  const form = useForm<SpecificationFormData, any, SpecificationFormOutput>({
    resolver: zodResolver(specificationSchema),
    defaultValues: {
      name_en: "",
      name_ar: "",
      unit_en: "",
      unit_ar: "",
      parent_id: null,
      parent_value_id: null,
      for_all_categories: false,
      allow_ai_inference: false,
      category_ids: [],
      is_active: true,
      list_separately: false,
    },
    mode: "onSubmit",
  });

  const { watch, setValue, formState: { errors }, trigger, reset } = form;
  
  // Watch form values
  const nameEn = watch("name_en");
  const nameAr = watch("name_ar");
  const unitEn = watch("unit_en");
  const unitAr = watch("unit_ar");
  const parentId = watch("parent_id");
  const parentValueId = watch("parent_value_id");
  const forAllCategories = watch("for_all_categories");
  const allowAiInference = watch("allow_ai_inference");
  const categoryIds = watch("category_ids") || [];
  const isActive = watch("is_active");
  const listSeparately = watch("list_separately");

  // Local state for values (managed locally, sent with save)
  const [localValues, setLocalValues] = useState<SpecificationValue[]>([]);
  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState<SpecificationValue[]>([]);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [valueToDelete, setValueToDelete] = useState<SpecificationValue | null>(null);

  // Queries and mutations
  const { data: specification, isLoading, isError, error, refetch } = useSpecification(
    specificationId,
    { enabled: !!specificationId }
  );
  const { data: allSpecifications = [] } = useSpecifications();
  const { data: categories = [] } = useCategories();
  const updateSpecification = useUpdateSpecification();
  const deleteValue = useDeleteSpecificationValue();

  // Initialize form and local values when specification loads
  useEffect(() => {
    if (specification) {
      reset({
        name_en: specification.name_en,
        name_ar: specification.name_ar,
        unit_en: specification.unit_en || "",
        unit_ar: specification.unit_ar || "",
        parent_id: specification.parent_id,
        parent_value_id: specification.parent_value_id,
        for_all_categories: specification.for_all_categories ?? false,
        allow_ai_inference: specification.allow_ai_inference ?? false,
        category_ids: extractCategoryIds(specification),
        is_active: specification.is_active,
        list_separately: specification.list_separately ?? false,
      });
      const sortedValues = [...(specification.values || [])].sort((a, b) => a.sort_order - b.sort_order);
      setLocalValues(sortedValues);
      setOriginalValues(sortedValues);
    }
  }, [specification, reset]);

  const handleNameEnChange = (value: string) => {
    setValue("name_en", value);
    if (errors.name_en) {
      trigger("name_en");
    }
  };

  const handleNameArChange = (value: string) => {
    setValue("name_ar", value);
    if (errors.name_ar) {
      trigger("name_ar");
    }
  };

  // Handle local values change
  const handleValuesChange = (values: SpecificationValue[]) => {
    setLocalValues(values);
  };

  // Handle form submission
  const onSubmit = async (data: SpecificationFormOutput) => {
    try {
      // Build the values payload - include all values with their current state
      // New values have negative IDs, existing values have positive IDs
      const valuesPayload = localValues.map((v, index) => ({
        id: v.id > 0 ? v.id : undefined, // Only include ID for existing values
        value_en: v.value_en,
        value_ar: v.value_ar,
        parent_value_id: v.parent_value_id,
        sort_order: index,
        is_active: v.is_active,
      }));

      await updateSpecification.mutateAsync({
        id: specificationId,
        data: {
          name_en: data.name_en,
          name_ar: data.name_ar,
          unit_en: data.unit_en || undefined,
          unit_ar: data.unit_ar || undefined,
          parent_id: data.parent_id,
          parent_value_id: data.parent_value_id,
          for_all_categories: data.for_all_categories,
          allow_ai_inference: data.allow_ai_inference,
          category_ids: data.for_all_categories ? [] : data.category_ids,
          is_active: data.is_active,
          list_separately: data.list_separately,
          values: valuesPayload,
        },
      });
      router.push('/specifications');
    } catch (error) {
      console.error("Failed to update specification:", error);
    }
  };

  const handleSaveSpecification = () => {
    form.handleSubmit(onSubmit)();
  };

  const handleDeleteClick = (value: SpecificationValue) => {
    setValueToDelete(value);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (valueToDelete) {
      try {
        // If it's an existing value (positive ID), delete from backend
        if (valueToDelete.id > 0) {
          await deleteValue.mutateAsync({
            valueId: valueToDelete.id,
            specificationId,
          });
        }
        // Remove from local state
        setLocalValues(prev => prev.filter(v => v.id !== valueToDelete.id));
        setDeleteModalOpen(false);
        setValueToDelete(null);
      } catch (error) {
        console.error("Failed to delete value:", error);
      }
    }
  };

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
              <h3 className="text-xl font-bold">Error Loading Specification</h3>
              <p className="max-w-md mx-auto">
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
    <>
      <SpecificationForm
        mode="edit"
        nameEn={nameEn}
        nameAr={nameAr}
        unitEn={unitEn || ""}
        unitAr={unitAr || ""}
        parentId={parentId?.toString() || ""}
        parentValueId={parentValueId?.toString() || ""}
        categoryIds={categoryIds.map(String)}
        forAllCategories={!!forAllCategories}
        allowAiInference={!!allowAiInference}
        isActive={!!isActive}
        onNameEnChange={handleNameEnChange}
        onNameArChange={handleNameArChange}
        onUnitEnChange={(val) => setValue("unit_en", val)}
        onUnitArChange={(val) => setValue("unit_ar", val)}
        onParentIdChange={(val) => setValue("parent_id", val ? Number(val) : null)}
        onParentValueIdChange={(val) => setValue("parent_value_id", val ? Number(val) : null)}
        onCategoryIdsChange={(ids) => setValue("category_ids", ids.map(Number))}
        onForAllCategoriesChange={(value) => setValue("for_all_categories", value)}
        onAllowAiInferenceChange={(value) => setValue("allow_ai_inference", value)}
        onIsActiveChange={(value) => setValue("is_active", value)}
        listSeparately={listSeparately}
        onListSeparatelyChange={(value) => setValue("list_separately", value)}
        formErrors={{
          name_en: errors.name_en?.message,
          name_ar: errors.name_ar?.message,
        }}
        values={localValues}
        onValuesChange={handleValuesChange}
        onDeleteValue={handleDeleteClick}
        onSubmit={handleSaveSpecification}
        isSubmitting={updateSpecification.isPending}
        submitButtonText="Save Changes"
        specifications={allSpecifications.filter((attr: Specification) => attr.id !== specificationId)}
        categories={categories}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setValueToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Value"
        itemName={valueToDelete?.value_en}
        isLoading={deleteValue.isPending}
      />
    </>
  );
}
