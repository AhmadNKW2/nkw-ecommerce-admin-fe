"use client";

/**
 * Attribute Edit Page
 * Uses React Hook Form + Zod for validation
 * Values are managed locally and sent with attribute update
 */

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/hooks/use-loading-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLoading } from "../../src/providers/loading-provider";
import { useCategories } from "../../src/services/categories/hooks/use-categories";
import {
  useAttribute,
  useAttributes,
  useUpdateAttribute,
  useDeleteAttributeValue,
} from "../../src/services/attributes/hooks/use-attributes";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Card } from "../../src/components/ui/card";
import { Button } from "../../src/components/ui/button";
import { DeleteConfirmationModal } from "../../src/components/common/DeleteConfirmationModal";
import { AttributeValue, Attribute } from "../../src/services/attributes/types/attribute.types";
import { AttributeForm } from "../../src/components/attributes/AttributeForm";
import { attributeSchema, type AttributeFormData, type AttributeFormOutput } from "../../src/lib/validations/attribute.schema";

const extractCategoryIds = (attribute?: Attribute | null): number[] => {
  if (!attribute) {
    return [];
  }

  const directIds = Array.isArray(attribute.category_ids) ? attribute.category_ids : [];
  const relatedIds = Array.isArray(attribute.categories)
    ? attribute.categories
        .map((category) => category.id)
        .filter((categoryId): categoryId is number => typeof categoryId === "number")
    : [];

  return [...new Set([...directIds, ...relatedIds])];
};

export default function AttributeEditPage() {
  const params = useParams();
  const attributeId = Number(params.id);
  const router = useRouter();
  const { setShowOverlay } = useLoading();

  // React Hook Form with Zod
  const form = useForm<AttributeFormData, any, AttributeFormOutput>({
    resolver: zodResolver(attributeSchema),
    defaultValues: {
      name_en: "",
      name_ar: "",
      unit_en: "",
      unit_ar: "",
      parent_id: null,
      parent_value_id: null,
      is_color: false,
      for_all_categories: false,
      allow_ai_inference: false,
      is_active: true,
      attribute_type: "spec_attribute",
      list_separately: false,
      category_ids: [],
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
  const categoryIds = watch("category_ids") || [];
  const isColor = watch("is_color");
  const forAllCategories = watch("for_all_categories");
  const allowAiInference = watch("allow_ai_inference");
  const isActive = watch("is_active");
  const listSeparately = watch("list_separately");

  // Local state for values (managed locally, sent with save)
  const [localValues, setLocalValues] = useState<AttributeValue[]>([]);
  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState<AttributeValue[]>([]);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [valueToDelete, setValueToDelete] = useState<AttributeValue | null>(null);

  // Queries and mutations
  const { data: attribute, isLoading, isError, error, refetch } = useAttribute(
    attributeId,
    { enabled: !!attributeId }
  );
  const { data: allAttributes = [] } = useAttributes();
  const { data: categories = [] } = useCategories();
  const updateAttribute = useUpdateAttribute();
  const deleteValue = useDeleteAttributeValue();

  // Initialize form and local values when attribute loads
  useEffect(() => {
    if (attribute) {
      reset({
        name_en: attribute.name_en,
        name_ar: attribute.name_ar,
        unit_en: attribute.unit_en || "",
        unit_ar: attribute.unit_ar || "",
        parent_id: attribute.parent_id,
        parent_value_id: attribute.parent_value_id,
        is_color: attribute.is_color ?? false,
        for_all_categories: attribute.for_all_categories ?? false,
        allow_ai_inference: attribute.allow_ai_inference ?? false,
        is_active: attribute.is_active,
        attribute_type: attribute.attribute_type ?? "spec_attribute",
        list_separately: attribute.list_separately ?? false,
        category_ids: extractCategoryIds(attribute),
      });
      const sortedValues = [...(attribute.values || [])].sort((a, b) => a.sort_order - b.sort_order);
      setLocalValues(sortedValues);
      setOriginalValues(sortedValues);
    }
  }, [attribute, reset]);

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
  const handleValuesChange = (values: AttributeValue[]) => {
    setLocalValues(values);
  };

  // Handle form submission
  const onSubmit = async (data: AttributeFormOutput) => {
    try {
      // Build the values payload - include all values with their current state
      // New values have negative IDs, existing values have positive IDs
      const valuesPayload = localValues.map((v, index) => ({
        id: v.id > 0 ? v.id : undefined, // Only include ID for existing values
        value_en: v.value_en,
        value_ar: v.value_ar,
        parent_value_id: v.parent_value_id,
        color_code: v.color_code,
        sort_order: index,
        is_active: v.is_active,
      }));

      await updateAttribute.mutateAsync({
        id: attributeId,
        data: {
          name_en: data.name_en,
          name_ar: data.name_ar,
          unit_en: data.unit_en || undefined,
          unit_ar: data.unit_ar || undefined,
          parent_id: data.parent_id,
          parent_value_id: data.parent_value_id,
          is_color: data.is_color,
          for_all_categories: data.for_all_categories,
          allow_ai_inference: data.allow_ai_inference,
          is_active: data.is_active,
          attribute_type: data.attribute_type,
          list_separately: data.list_separately,
          category_ids: data.for_all_categories ? [] : data.category_ids,
          values: valuesPayload,
        },
      });
      router.push('/attributes');
    } catch (error) {
      console.error("Failed to update attribute:", error);
    }
  };

  const handleSaveAttribute = () => {
    form.handleSubmit(onSubmit)();
  };

  const handleDeleteClick = (value: AttributeValue) => {
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
            attributeId,
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
              <h3 className="text-xl font-bold">Error Loading Attribute</h3>
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
      <AttributeForm
        mode="edit"
        nameEn={nameEn}
        nameAr={nameAr}
        unitEn={unitEn || ""}
        unitAr={unitAr || ""}
        parentId={parentId?.toString() || ""}
        parentValueId={parentValueId?.toString() || ""}
        categoryIds={categoryIds.map(String)}
        isColor={isColor}
        forAllCategories={!!forAllCategories}
        allowAiInference={!!allowAiInference}
        isActive={isActive}
        onNameEnChange={handleNameEnChange}
        onNameArChange={handleNameArChange}
        onUnitEnChange={(val) => setValue("unit_en", val)}
        onUnitArChange={(val) => setValue("unit_ar", val)}
        onParentIdChange={(val) => setValue("parent_id", val ? Number(val) : null)}
        onParentValueIdChange={(val) => setValue("parent_value_id", val ? Number(val) : null)}
        onCategoryIdsChange={(ids) => setValue("category_ids", ids.map(Number))}
        onIsColorChange={(value) => setValue("is_color", value)}
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
        onSubmit={handleSaveAttribute}
        isSubmitting={updateAttribute.isPending}
        submitButtonText="Save Changes"
        attributes={allAttributes.filter((attr: Attribute) => attr.id !== attributeId)}
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
