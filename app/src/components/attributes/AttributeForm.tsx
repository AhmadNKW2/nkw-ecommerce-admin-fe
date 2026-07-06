"use client";

/**
 * Shared Attribute Form Component
 * Uses React Hook Form + Zod for validation
 */

import React, { useState, useMemo } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tag, Palette, GripVertical, Layers, ListFilter } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Toggle } from "../ui/toggle";
import { IconButton } from "../ui/icon-button";
import { PageHeader } from "../common/PageHeader";
import { cn } from "../../lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Attribute, AttributeValue } from "../../services/attributes/types/attribute.types";
import {
  createAttributeValueSchema,
  type AttributeValueFormData,
  type AttributeValueFormOutput,
} from "../../lib/validations/attribute.schema";
import { CategoryTreeSelect } from "../products/CategoryTreeSelect";
import { Category } from "../../services/categories/types/category.types";

// DnD Kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEnterToSubmit } from "../../hooks/use-enter-to-submit";

// Value type for display (using AttributeValue for both modes)
type ValueItem = AttributeValue;

// ============================================
// Color Input Component (Hex input + Color picker)
// ============================================
interface ColorInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | boolean;
}

const ColorInput: React.FC<ColorInputProps> = ({ id, value, onChange, error }) => {
  const colorInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        size="sm"
        className="w-21"
        error={error}
      />
      <div className="relative">
        <input
          ref={colorInputRef}
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute opacity-0 w-0 h-0"
        />
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          className="w-6 h-6 rounded-full flex items-center justify-center hover:opacity-75 transition-all shadow-s1 border border-black/20"
          style={{ backgroundColor: value || "#fff" }}
        >
      </button>
      </div>
    </div>
  );
};

// ============================================
// useValueForm Hook (for inline add/edit with RHF + Zod)
// ============================================
const useValueForm = (isColor: boolean) => {
  const schema = useMemo(() => createAttributeValueSchema(isColor), [isColor]);

  return useForm<AttributeValueFormData, any, AttributeValueFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      value_en: "",
      value_ar: "",
      parent_value_id: null,
      color_code: "",
    },
    mode: "onChange",
  });
};

// ============================================
// New Value Row Component (inline add)
// ============================================
interface NewValueRowProps {
  isColor: boolean;
  isAdding: boolean;
  onSave: (data: AttributeValueFormOutput) => void;
  onCancel: () => void;
}

const NewValueRow: React.FC<NewValueRowProps> = ({
  isColor,
  isAdding,
  onSave,
  onCancel,
}) => {
  const form = useValueForm(isColor);
  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;

  const colorCode = watch("color_code");

  const onSubmit = handleSubmit((data) => {
    onSave(data);
    form.reset();
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      onSubmit();
    }
  };

  return (
    <TableRow className="bg-primary/5">
      <TableCell>
        <GripVertical className="h-5 w-5 text-primary/25" />
      </TableCell>
      <TableCell className="font-mono text-sm text-primary/75">New</TableCell>
      <TableCell>
        <Input
          id="value_en"
          {...register("value_en")}
          size="sm"
          error={errors.value_en?.message}
          autoFocus
          className="w-full"
          onKeyDown={handleKeyDown}
        />
      </TableCell>
      <TableCell>
        <Input
          id="value_ar"
          {...register("value_ar")}
          size="sm"
          isRtl
          error={errors.value_ar?.message}
          className="w-full"
          onKeyDown={handleKeyDown}
        />
      </TableCell>
      {isColor && (
        <TableCell>
          <ColorInput
            id="color_code"
            value={colorCode || ""}
            onChange={(val) => setValue("color_code", val, { shouldValidate: true })}
            error={errors.color_code?.message}
          />
        </TableCell>
      )}
      <TableCell>
        <div className="flex gap-1">
          <IconButton
            variant="check"
            onClick={onSubmit}
            title="Save"
            disabled={isAdding}
          />
          <IconButton variant="cancel" onClick={onCancel} title="Cancel" />
        </div>
      </TableCell>
    </TableRow>
  );
};


// ============================================
// Sortable Value Row Component (Display Mode)
// ============================================
interface SortableValueRowProps {
  value: ValueItem;
  isColor: boolean;
  onEdit: (value: ValueItem) => void;
  onDelete: (value: ValueItem) => void;
  isCreateMode?: boolean;
}

const SortableValueRow: React.FC<SortableValueRowProps> = ({
  value,
  isColor,
  onEdit,
  onDelete,
  isCreateMode = false,
}) => {
  const {
    attributes: dndAttributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: value.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 300ms ease, box-shadow 300ms ease",
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? "relative" : undefined,
    boxShadow: isDragging
      ? "0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)"
      : undefined,
  };

  const displayOrder = value.sort_order;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={isDragging ? "bg-primary/5 scale-[1.02] rounded-lg" : ""}
    >
      <TableCell>
        <button
          className={`cursor-grab active:cursor-grabbing p-2 rounded-lg transition-all duaration-300 ${isDragging
            ? "bg-primary/20 shadow-sm"
            : "hover:bg-primary/10 hover:shadow-sm"
            }`}
          {...dndAttributes}
          {...listeners}
        >
          <GripVertical
            className={`h-5 w-5 transition-colors duaration-300 ${isDragging ? "text-primary" : "text-primary/50 group-hover:text-gray-600"
              }`}
          />
        </button>
      </TableCell>
      <TableCell className="font-mono text-sm">{displayOrder}</TableCell>
      <TableCell>
        <span>{value.value_en}</span>
      </TableCell>
      <TableCell>
        <span dir="rtl">{value.value_ar}</span>
      </TableCell>
      {isColor && (
        <TableCell>
          {value.color_code ? (
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full shrink-0 shadow-s1 border border-black/20"
                style={{ backgroundColor: value.color_code }}
              />
              <span className="text-sm text-gray-500">{value.color_code}</span>
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </TableCell>
      )}
      <TableCell>
        <div className="flex gap-1">
          <IconButton
            variant="edit"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(value);
            }}
            title="Edit value"
          />
          <IconButton
            variant="delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(value);
            }}
            title="Delete value"
          />
        </div>
      </TableCell>
    </TableRow>
  );
};

// ============================================
// Editable Value Row Component (Edit Mode with RHF)
// ============================================
interface EditableValueRowProps {
  value: ValueItem;
  isColor: boolean;
  onSave: (data: AttributeValueFormOutput) => void;
  onCancel: () => void;
  isCreateMode?: boolean;
}

const EditableValueRow: React.FC<EditableValueRowProps> = ({
  value,
  isColor,
  onSave,
  onCancel,
  isCreateMode = false,
}) => {
  const form = useValueForm(isColor);
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = form;

  // Initialize form with existing values
  React.useEffect(() => {
    reset({
      value_en: value.value_en,
      value_ar: value.value_ar,
      color_code: value.color_code || "",
    });
  }, [value, reset]);

  const colorCode = watch("color_code");

  const {
    attributes: dndAttributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: value.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease, box-shadow 200ms ease",
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? "relative" : undefined,
    boxShadow: isDragging
      ? "0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)"
      : undefined,
  };

  const displayOrder = value.sort_order;

  const onSubmit = handleSubmit((data) => {
    onSave(data);
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      onSubmit();
    }
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={isDragging ? "bg-primary/5 scale-[1.02] rounded-lg" : ""}
    >
      <TableCell>
        <button
          className={`cursor-grab active:cursor-grabbing p-2 rounded-lg transition-all duaration-300 ${isDragging
            ? "bg-primary/20 shadow-sm"
            : "hover:bg-primary/10 hover:shadow-sm"
            }`}
          {...dndAttributes}
          {...listeners}
        >
          <GripVertical
            className={`h-5 w-5 transition-colors duaration-300 ${isDragging ? "text-primary" : "text-primary/50 group-hover:text-gray-600"
              }`}
          />
        </button>
      </TableCell>
      <TableCell className="font-mono text-sm">{displayOrder}</TableCell>
      <TableCell>
        <Input
          {...register("value_en")}
          className="w-full"
          size="sm"
          error={errors.value_en?.message}
          onKeyDown={handleKeyDown}
        />
      </TableCell>
      <TableCell>
        <Input
          {...register("value_ar")}
          className="w-full"
          size="sm"
          isRtl
          error={errors.value_ar?.message}
          onKeyDown={handleKeyDown}
        />
      </TableCell>
      {isColor && (
        <TableCell>
          <ColorInput
            id="edit_color_code"
            value={colorCode || ""}
            onChange={(val) => setValue("color_code", val, { shouldValidate: true })}
            error={errors.color_code?.message}
          />
        </TableCell>
      )}
      <TableCell>
        <div className="flex gap-1">
          <IconButton variant="check" onClick={onSubmit} title="Save" />
          <IconButton variant="cancel" onClick={onCancel} title="Cancel" />
        </div>
      </TableCell>
    </TableRow>
  );
};

// ============================================
// Main AttributeForm Component
// ============================================

interface AttributeFormProps {
  mode: "create" | "edit";
  // Attribute data
  nameEn: string;
  nameAr: string;
  unitEn: string;
  unitAr: string;
  parentId?: string;
  parentValueId?: string;
  isColor: boolean;
  forAllCategories: boolean;
  allowAiInference: boolean;
  isActive: boolean;
  onNameEnChange: (value: string) => void;
  onNameArChange: (value: string) => void;
  onUnitEnChange: (value: string) => void;
  onUnitArChange: (value: string) => void;
  onParentIdChange: (value: string) => void;
  onParentValueIdChange: (value: string) => void;
  categoryIds: string[];
  onCategoryIdsChange: (value: string[]) => void;
  onIsColorChange: (value: boolean) => void;
  onForAllCategoriesChange: (value: boolean) => void;
  onAllowAiInferenceChange: (value: boolean) => void;
  onIsActiveChange: (value: boolean) => void;
  listSeparately?: boolean | null;
  onListSeparatelyChange?: (value: boolean) => void;
  attributes?: Attribute[]; // List of available attributes for parent selection
  categories?: Category[];
  // Validation - now using React Hook Form
  formErrors?: { name_en?: string; name_ar?: string };
  // Values (for both create and edit modes - managed locally)
  values: AttributeValue[];
  onValuesChange: (values: AttributeValue[]) => void;
  // For delete confirmation in edit mode
  onDeleteValue?: (value: AttributeValue) => void;
  // Submit
  onSubmit: () => void;
  isSubmitting: boolean;
  submitButtonText: string;
}

export const AttributeForm: React.FC<AttributeFormProps> = ({
  mode,
  nameEn,
  nameAr,
  unitEn,
  unitAr,
  parentId,
  parentValueId,
  isColor,
  forAllCategories,
  allowAiInference,
  isActive,
  onNameEnChange,
  onNameArChange,
  onUnitEnChange,
  onUnitArChange,
  onParentIdChange,
  onParentValueIdChange,
  categoryIds,
  onCategoryIdsChange,
  onIsColorChange,
  onForAllCategoriesChange,
  onAllowAiInferenceChange,
  onIsActiveChange,
  listSeparately = false,
  onListSeparatelyChange,
  attributes = [], // Default to empty array
  categories = [],
  formErrors,
  values,
  onValuesChange,
  onDeleteValue,
  onSubmit,
  isSubmitting,
  submitButtonText,
}) => {
  const router = useRouter();
  useEnterToSubmit(onSubmit, isSubmitting);

  // State for add/edit mode
  const [showNewValueRow, setShowNewValueRow] = useState(false);
  const [editingValueId, setEditingValueId] = useState<number | string | null>(null);
  // Counter for generating temporary IDs for new values
  const [tempIdCounter, setTempIdCounter] = useState(1);
  
  // State for active parent value tab
  const [activeParentValueId, setActiveParentValueId] = useState<string | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Derived state: parent attribute and its values
  const parentAttribute = useMemo(() => {
    return attributes.find(attr => attr.id.toString() === parentId);
  }, [attributes, parentId]);

  const parentValues = useMemo(() => {
    return parentAttribute?.values || [];
  }, [parentAttribute]);

  // Set default active parent value if available and not set
  React.useEffect(() => {
    if (parentAttribute && parentValues.length > 0 && !activeParentValueId) {
      setActiveParentValueId(parentValues[0].id.toString());
    } else if (!parentAttribute) {
      setActiveParentValueId(null);
    }
  }, [parentAttribute, parentValues, activeParentValueId]);

  // Sort values for display and filter by active parent value
  const displayValues = useMemo(() => {
    let filtered = [...values];
    
    // If we have a parent attribute, filter by the active parent value tab
    if (parentAttribute && activeParentValueId) {
      filtered = filtered.filter(v => 
        v.parent_value_id?.toString() === activeParentValueId
      );
    }
    
    return filtered.sort((a, b) => a.sort_order - b.sort_order);
  }, [values, parentAttribute, activeParentValueId]);

  // Handle add value button click
  const handleAddValueClick = () => {
    setShowNewValueRow(true);
    setEditingValueId(null);
  };

  // Handle save new value (local state update only)
  const handleSaveNewValue = (data: AttributeValueFormOutput) => {
    // Generate a temporary negative ID for new values (to distinguish from existing ones)
    const tempId = -tempIdCounter;
    setTempIdCounter(prev => prev + 1);
    
    const newValue: AttributeValue = {
      id: tempId,
      attribute_id: 0, // Will be set by backend
      value_en: data.value_en,
      value_ar: data.value_ar,
      // Use activeParentValueId if set
      parent_value_id: activeParentValueId ? Number(activeParentValueId) : null,
      color_code: isColor ? data.color_code || null : null,
      image_url: null,
      sort_order: values.length,
      is_active: true,
    };
    
    onValuesChange([...values, newValue]);
    setShowNewValueRow(false);
  };

  // Handle cancel new value
  const handleCancelNewValue = () => {
    setShowNewValueRow(false);
  };

  // Handle edit value
  const handleEditValue = (value: ValueItem) => {
    setEditingValueId(value.id);
    setShowNewValueRow(false);
  };

  // Handle save edit (local state update only)
  const handleSaveEdit = (valueId: number | string, data: AttributeValueFormOutput) => {
    const updatedValues = values.map((v) =>
      v.id === valueId
        ? { 
            ...v, 
            value_en: data.value_en, 
            value_ar: data.value_ar, 
            // Keep existing parent_value_id or use active one if we want to enforce current tab
            parent_value_id: v.parent_value_id, 
            color_code: isColor ? data.color_code || null : null 
          }
        : v
    );
    onValuesChange(updatedValues);
    setEditingValueId(null);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingValueId(null);
  };

  // Handle delete value
  const handleDeleteValue = (value: ValueItem) => {
    // For existing values (positive ID), show confirmation modal
    if (typeof value.id === 'number' && value.id > 0 && onDeleteValue) {
      onDeleteValue(value as AttributeValue);
    } else {
      // For new values (negative/temp ID), just remove from local state
      onValuesChange(values.filter((v) => v.id !== value.id));
    }
  };

  // Handle drag end (local state update only)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const sortedValues = [...values].sort((a, b) => a.sort_order - b.sort_order);
      const oldIndex = sortedValues.findIndex((item) => item.id === active.id);
      const newIndex = sortedValues.findIndex((item) => item.id === over.id);

      const newOrder = arrayMove(sortedValues, oldIndex, newIndex);
      const reorderedValues = newOrder.map((item, index) => ({
        ...item,
        sort_order: index,
      }));
      onValuesChange(reorderedValues);
    }
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <PageHeader
        icon={<Tag />}
        title={mode === "create" ? "Create Attribute" : "Edit Attribute"}
        description={mode === "create" ? "Add a new product attribute" : "Manage attribute details and values"}
        cancelAction={{
          label: "Cancel",
          onClick: () => router.push("/attributes"),
          disabled: isSubmitting,
        }}
        action={{
          label: isSubmitting ? "Saving..." : submitButtonText,
          onClick: onSubmit,
          disabled: isSubmitting,
        }}
      />

      {/* Attribute Details Form */}
        <Card className="w-full relative z-10">
        <h2 className="text-lg font-semibold">Attribute Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="Name (English) *"
            value={nameEn}
            onChange={(e) => onNameEnChange(e.target.value)}
            error={formErrors?.name_en}
            required
          />
          <Input
            label="Name (Arabic) *"
            value={nameAr}
            onChange={(e) => onNameArChange(e.target.value)}
            error={formErrors?.name_ar}
            isRtl
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          <Input
            label="Unit (English) - Optional"
            value={unitEn}
            onChange={(e) => onUnitEnChange(e.target.value)}
            placeholder="e.g. kg, m, L"
          />
          <Input
            label="Unit (Arabic) - Optional"
            value={unitAr}
            onChange={(e) => onUnitArChange(e.target.value)}
            placeholder="e.g. كغ، م، ل"
            isRtl
          />
        </div>
        
        <div className="mt-4">
          <Select
            label="Parent Attribute (Optional)"
            value={parentId || ""}
            onChange={(val) => {
              onParentIdChange(val as string);
              // Clear parent value when parent attribute changes
              onParentValueIdChange("");
            }}
            options={attributes.map(attr => ({
              value: attr.id.toString(),
              label: attr.name_en
            }))}
            placeholder="Select a parent attribute"
            onClear={() => {
              onParentIdChange("");
              onParentValueIdChange("");
            }}
          />
        </div>

        <div className="mt-4">
          <CategoryTreeSelect
            label="Categories"
            categories={categories}
            selectedIds={forAllCategories ? [] : categoryIds}
            onChange={onCategoryIdsChange}
            disabled={forAllCategories}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Checkbox
            checked={forAllCategories}
            onChange={onForAllCategoriesChange}
            label="All Categories"
          />
          <Checkbox
            checked={allowAiInference}
            onChange={onAllowAiInferenceChange}
            label="Allow AI Inference"
          />
          {forAllCategories && (
            <p className="text-sm text-gray-500">
              This attribute will be available for every category. Specific category selection will be ignored when you save.
            </p>
          )}
        </div>

        <div className="flex items-center gap-8 mt-5">
          <div className="flex items-center gap-3">
            <Toggle checked={isColor} onChange={onIsColorChange} />
            <span className="text-sm font-medium">Is Color Attribute</span>
          </div>
          <div className="flex items-center gap-3">
            <Toggle checked={!!listSeparately} onChange={(val) => onListSeparatelyChange?.(val)} />
            <span className="text-sm font-medium">List Separately</span>
          </div>
          <div className="flex items-center gap-3">
            <Toggle checked={isActive} onChange={onIsActiveChange} />
            <span className="text-sm font-medium">Active</span>
          </div>
        </div>
      </Card>

      {/* Attribute Values */}
      <Card className="w-full overflow-hidden">
        <div className="p-1 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {mode === "create" ? "Attribute Values" : "Manage Values"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {mode === "create" 
                  ? "Define the initial values for this attribute." 
                  : "Add, edit, or reorder the values available for this attribute."}
              </p>
            </div>

            <Button
              type="button"
              onClick={handleAddValueClick}
              disabled={showNewValueRow || (!!parentAttribute && !activeParentValueId)}
              color="var(--color-primary)"
              className="shadow-sm"
            >
              Add New Value
            </Button>
          </div>

          {/* Parent Values Tabs */}
          {parentAttribute && parentValues.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest pl-1">
                 <ListFilter className="w-3 h-3" />
                 <span>{parentAttribute.name_en} Categories</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {parentValues.map((pv) => {
                  const isActive = activeParentValueId === pv.id.toString();
                  return (
                    <button
                      key={pv.id}
                      type="button"
                      onClick={() => setActiveParentValueId(pv.id.toString())}
                      className={cn(
                        "px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-300 ease-out border md:flex-1 md:max-w-fit text-center",
                        isActive 
                          ? "bg-primary text-white border-primary shadow-md shadow-primary/25 scale-105" 
                          : "bg-white text-gray-600 border-gray-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                      )}
                    >
                      {pv.value_en}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State for Tabs */}
          {parentAttribute && parentValues.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 bg-amber-50 border border-amber-100 rounded-2xl text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3">
                <Layers className="w-6 h-6" />
              </div>
              <p className="font-semibold text-amber-900">Missing Parent Values</p>
              <p className="text-sm text-amber-700 mt-1">
                Please add values to the <strong>{parentAttribute.name_en}</strong> attribute first.
              </p>
            </div>
          )}
        </div>

        <div className="mt-2 -mx-6 sm:mx-0">
          {displayValues.length === 0 && !showNewValueRow ? (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-b-xl border-t border-gray-100">
              <div className="w-20 h-20 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center mb-5">
                <Tag className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">No Values Yet</h3>
              <p className="text-gray-500 text-sm max-w-sm text-center mb-8 px-4">
                {!!parentAttribute && !activeParentValueId 
                  ? "Select a category above to start adding values."
                  : "Start building your attribute by adding its first value."}
              </p>
              <Button
                type="button"
                onClick={handleAddValueClick}
                disabled={!!parentAttribute && !activeParentValueId}
                variant="outline"
                className="bg-white hover:bg-gray-50"
              >
                Add First Value
              </Button>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden shadow-sm bg-white isolate transform-gpu relative z-0">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table noPagination={true}>
                  <TableHeader className="bg-gray-50/80">
                    <TableRow isHeader className="hover:bg-transparent border-gray-100">
                      <TableHead width="60px"><span className="sr-only">Sort</span></TableHead>
                      <TableHead width={isColor ? "5%" : "5%"} className="text-gray-500 font-medium">#</TableHead>
                  <TableHead width={isColor ? "40%" : "42%"}>Name (EN)</TableHead>
                  <TableHead width={isColor ? "40%" : "42%"}>Name (AR)</TableHead>
                  {isColor && <TableHead width="11%">Color</TableHead>}
                  <TableHead width={isColor ? "10%" : "11%"}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* New Value Row (inline add at top) */}
                {showNewValueRow && (
                  <NewValueRow
                    isColor={isColor}
                    isAdding={false}
                    onSave={handleSaveNewValue}
                    onCancel={handleCancelNewValue}
                  />
                )}
                <SortableContext
                  items={displayValues.map((v) => v.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {displayValues.map((value) => {
                    const isEditing = editingValueId === value.id;

                    if (isEditing) {
                      return (
                        <EditableValueRow
                          key={value.id}
                          value={value}
                          isColor={isColor}
                          onSave={(data) => handleSaveEdit(value.id, data)}
                          onCancel={handleCancelEdit}
                          isCreateMode={mode === "create"}
                        />
                      );
                    }

                    return (
                      <SortableValueRow
                        key={value.id}
                        value={value}
                        isColor={isColor}
                        onEdit={handleEditValue}
                        onDelete={handleDeleteValue}
                        isCreateMode={mode === "create"}
                      />
                    );
                  })}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
          </div>
        )}
        </div>
      </Card>
    </div>
  );
};

export default AttributeForm;
