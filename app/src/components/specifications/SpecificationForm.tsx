"use client";

import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/hooks/use-loading-router";
import { GripVertical, Layers, ListFilter, Tag } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { IconButton } from "../ui/icon-button";
import { Input } from "../ui/input";
import { PageHeader } from "../common/PageHeader";
import { Select } from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Toggle } from "../ui/toggle";
import { cn } from "../../lib/utils";
import { useEnterToSubmit } from "../../hooks/use-enter-to-submit";
import { CategoryTreeSelect } from "../products/CategoryTreeSelect";
import {
  createSpecificationValueSchema,
  type SpecificationValueFormData,
  type SpecificationValueFormOutput,
} from "../../lib/validations/specification.schema";
import {
  Specification,
  SpecificationValue,
} from "../../services/specifications/types/specification.types";
import { Category } from "../../services/categories/types/category.types";

type ValueItem = SpecificationValue;

const useValueForm = () => {
  const schema = useMemo(() => createSpecificationValueSchema(), []);

  return useForm<SpecificationValueFormData, any, SpecificationValueFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      value_en: "",
      value_ar: "",
      parent_value_id: null,
    },
    mode: "onChange",
  });
};

interface NewValueRowProps {
  isAdding: boolean;
  onSave: (data: SpecificationValueFormOutput) => void;
  onCancel: () => void;
}

const NewValueRow: React.FC<NewValueRowProps> = ({
  isAdding,
  onSave,
  onCancel,
}) => {
  const form = useValueForm();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = form;

  const onSubmit = handleSubmit((data) => {
    onSave(data);
    form.reset();
  });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
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
          className="w-full"
          autoFocus
          error={errors.value_en?.message}
          onKeyDown={handleKeyDown}
        />
      </TableCell>
      <TableCell>
        <Input
          id="value_ar"
          {...register("value_ar")}
          size="sm"
          className="w-full"
          isRtl
          error={errors.value_ar?.message}
          onKeyDown={handleKeyDown}
        />
      </TableCell>
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

interface SortableValueRowProps {
  value: ValueItem;
  onEdit: (value: ValueItem) => void;
  onDelete: (value: ValueItem) => void;
}

const SortableValueRow: React.FC<SortableValueRowProps> = ({
  value,
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

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={isDragging ? "bg-primary/5 scale-[1.02] rounded-lg" : ""}
    >
      <TableCell>
        <button
          className={cn(
            "cursor-grab active:cursor-grabbing p-2 rounded-lg transition-all duration-300",
            isDragging
              ? "bg-primary/20 shadow-sm"
              : "hover:bg-primary/10 hover:shadow-sm"
          )}
          {...dndAttributes}
          {...listeners}
        >
          <GripVertical
            className={cn(
              "h-5 w-5 transition-colors duration-300",
              isDragging ? "text-primary" : "text-primary/50 group-hover:text-gray-600"
            )}
          />
        </button>
      </TableCell>
      <TableCell className="font-mono text-sm">{value.sort_order}</TableCell>
      <TableCell>{value.value_en}</TableCell>
      <TableCell>
        <span dir="rtl">{value.value_ar}</span>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <IconButton
            variant="edit"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(value);
            }}
            title="Edit value"
          />
          <IconButton
            variant="delete"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(value);
            }}
            title="Delete value"
          />
        </div>
      </TableCell>
    </TableRow>
  );
};

interface EditableValueRowProps {
  value: ValueItem;
  onSave: (data: SpecificationValueFormOutput) => void;
  onCancel: () => void;
}

const EditableValueRow: React.FC<EditableValueRowProps> = ({
  value,
  onSave,
  onCancel,
}) => {
  const form = useValueForm();
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = form;

  React.useEffect(() => {
    reset({
      value_en: value.value_en,
      value_ar: value.value_ar,
      parent_value_id: value.parent_value_id ?? null,
    });
  }, [reset, value]);

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

  const onSubmit = handleSubmit((data) => onSave(data));

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
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
          className={cn(
            "cursor-grab active:cursor-grabbing p-2 rounded-lg transition-all duration-300",
            isDragging
              ? "bg-primary/20 shadow-sm"
              : "hover:bg-primary/10 hover:shadow-sm"
          )}
          {...dndAttributes}
          {...listeners}
        >
          <GripVertical
            className={cn(
              "h-5 w-5 transition-colors duration-300",
              isDragging ? "text-primary" : "text-primary/50 group-hover:text-gray-600"
            )}
          />
        </button>
      </TableCell>
      <TableCell className="font-mono text-sm">{value.sort_order}</TableCell>
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
      <TableCell>
        <div className="flex gap-1">
          <IconButton variant="check" onClick={onSubmit} title="Save" />
          <IconButton variant="cancel" onClick={onCancel} title="Cancel" />
        </div>
      </TableCell>
    </TableRow>
  );
};

interface SpecificationFormProps {
  mode: "create" | "edit";
  nameEn: string;
  nameAr: string;
  unitEn: string;
  unitAr: string;
  parentId?: string;
  parentValueId?: string;
  categoryIds: string[];
  forAllCategories: boolean;
  allowAiInference: boolean;
  isActive: boolean;
  listSeparately?: boolean | null;
  onNameEnChange: (value: string) => void;
  onNameArChange: (value: string) => void;
  onUnitEnChange: (value: string) => void;
  onUnitArChange: (value: string) => void;
  onParentIdChange: (value: string) => void;
  onParentValueIdChange: (value: string) => void;
  onCategoryIdsChange: (value: string[]) => void;
  onForAllCategoriesChange: (value: boolean) => void;
  onAllowAiInferenceChange: (value: boolean) => void;
  onIsActiveChange: (value: boolean) => void;
  onListSeparatelyChange?: (value: boolean) => void;
  specifications?: Specification[];
  categories?: Category[];
  formErrors?: { name_en?: string; name_ar?: string };
  values: SpecificationValue[];
  onValuesChange: (values: SpecificationValue[]) => void;
  onDeleteValue?: (value: SpecificationValue) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitButtonText: string;
}

export const SpecificationForm: React.FC<SpecificationFormProps> = ({
  mode,
  nameEn,
  nameAr,
  unitEn,
  unitAr,
  parentId,
  parentValueId,
  categoryIds,
  forAllCategories,
  allowAiInference,
  isActive,
  listSeparately = false,
  onNameEnChange,
  onNameArChange,
  onUnitEnChange,
  onUnitArChange,
  onParentIdChange,
  onParentValueIdChange,
  onCategoryIdsChange,
  onForAllCategoriesChange,
  onAllowAiInferenceChange,
  onIsActiveChange,
  onListSeparatelyChange,
  specifications = [],
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

  const [showNewValueRow, setShowNewValueRow] = useState(false);
  const [editingValueId, setEditingValueId] = useState<number | string | null>(null);
  const [tempIdCounter, setTempIdCounter] = useState(1);
  const [activeParentValueId, setActiveParentValueId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const parentSpecification = useMemo(() => {
    return specifications.find((specification) => specification.id.toString() === parentId);
  }, [parentId, specifications]);

  const parentValues = useMemo(() => {
    return parentSpecification?.values || [];
  }, [parentSpecification]);

  React.useEffect(() => {
    if (!parentSpecification) {
      setActiveParentValueId(null);
      return;
    }

    if (parentValueId && parentValues.some((value) => value.id.toString() === parentValueId)) {
      setActiveParentValueId(parentValueId);
      return;
    }

    if (parentValues.length > 0) {
      setActiveParentValueId((currentValue) => currentValue || parentValues[0].id.toString());
      return;
    }

    setActiveParentValueId(null);
  }, [parentSpecification, parentValueId, parentValues]);

  const displayValues = useMemo(() => {
    let filtered = [...values];

    if (parentSpecification && activeParentValueId) {
      filtered = filtered.filter(
        (value) => value.parent_value_id?.toString() === activeParentValueId
      );
    }

    return filtered.sort((left, right) => left.sort_order - right.sort_order);
  }, [activeParentValueId, parentSpecification, values]);

  const handleAddValueClick = () => {
    setShowNewValueRow(true);
    setEditingValueId(null);
  };

  const handleSaveNewValue = (data: SpecificationValueFormOutput) => {
    const tempId = -tempIdCounter;
    setTempIdCounter((previous) => previous + 1);

    const newValue: SpecificationValue = {
      id: tempId,
      specification_id: 0,
      value_en: data.value_en,
      value_ar: data.value_ar,
      parent_value_id: activeParentValueId ? Number(activeParentValueId) : null,
      sort_order: displayValues.length,
      is_active: true,
    };

    onValuesChange([...values, newValue]);
    setShowNewValueRow(false);
  };

  const handleEditValue = (value: ValueItem) => {
    setEditingValueId(value.id);
    setShowNewValueRow(false);
  };

  const handleSaveEdit = (valueId: number | string, data: SpecificationValueFormOutput) => {
    onValuesChange(
      values.map((value) => {
        if (value.id !== valueId) {
          return value;
        }

        return {
          ...value,
          value_en: data.value_en,
          value_ar: data.value_ar,
        };
      })
    );
    setEditingValueId(null);
  };

  const handleDeleteValue = (value: ValueItem) => {
    if (typeof value.id === "number" && value.id > 0 && onDeleteValue) {
      onDeleteValue(value as SpecificationValue);
      return;
    }

    onValuesChange(values.filter((currentValue) => currentValue.id !== value.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const scopedValues = [...displayValues].sort((left, right) => left.sort_order - right.sort_order);
    const oldIndex = scopedValues.findIndex((item) => item.id === active.id);
    const newIndex = scopedValues.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedScope = arrayMove(scopedValues, oldIndex, newIndex).map((item, index) => ({
      ...item,
      sort_order: index,
    }));

    const nextValues = values.map((value) => {
      const updatedValue = reorderedScope.find((candidate) => candidate.id === value.id);
      return updatedValue || value;
    });

    onValuesChange(nextValues);
  };

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Tag />}
        title={mode === "create" ? "Create Specification" : "Edit Specification"}
        description={
          mode === "create"
            ? "Add a new product specification"
            : "Manage specification details and values"
        }
        cancelAction={{
          label: "Cancel",
          onClick: () => router.push("/specifications"),
          disabled: isSubmitting,
        }}
        action={{
          label: isSubmitting ? "Saving..." : submitButtonText,
          onClick: onSubmit,
          disabled: isSubmitting,
        }}
      />

      <Card className="w-full relative z-10">
        <h2 className="text-lg font-semibold">Specification Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="Name (English) *"
            value={nameEn}
            onChange={(event) => onNameEnChange(event.target.value)}
            error={formErrors?.name_en}
            required
          />
          <Input
            label="Name (Arabic) *"
            value={nameAr}
            onChange={(event) => onNameArChange(event.target.value)}
            error={formErrors?.name_ar}
            isRtl
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          <Input
            label="Unit (English)"
            value={unitEn}
            onChange={(event) => onUnitEnChange(event.target.value)}
            placeholder="e.g. kg, m, L"
          />
          <Input
            label="Unit (Arabic)"
            value={unitAr}
            onChange={(event) => onUnitArChange(event.target.value)}
            placeholder="e.g. كغ، م، ل"
            isRtl
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          <Select
            label="Parent Specification"
            value={parentId || ""}
            onChange={(value) => {
              onParentIdChange(value as string);
              onParentValueIdChange("");
            }}
            options={specifications.map((specification) => ({
              value: specification.id.toString(),
              label: specification.name_en,
            }))}
            placeholder="Select a parent specification"
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
              This specification will be available for every category. Specific category selection will be ignored when you save.
            </p>
          )}
        </div>

        <div className="flex items-center gap-8 mt-5">
          <div className="flex items-center gap-3">
            <Toggle checked={!!listSeparately} onChange={(value) => onListSeparatelyChange?.(value)} />
            <span className="text-sm font-medium">List Separately</span>
          </div>
          <div className="flex items-center gap-3">
            <Toggle checked={isActive} onChange={onIsActiveChange} />
            <span className="text-sm font-medium">Active</span>
          </div>
        </div>
      </Card>

      <Card className="w-full overflow-hidden">
        <div className="p-1 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {mode === "create" ? "Specification Values" : "Manage Values"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {mode === "create"
                  ? "Define the initial values for this specification."
                  : "Add, edit, or reorder the values available for this specification."}
              </p>
            </div>

            <Button
              type="button"
              onClick={handleAddValueClick}
              disabled={showNewValueRow || (!!parentSpecification && !activeParentValueId)}
              color="var(--color-primary)"
              className="shadow-sm"
            >
              Add New Value
            </Button>
          </div>

          {parentSpecification && parentValues.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest pl-1">
                <ListFilter className="w-3 h-3" />
                <span>{parentSpecification.name_en} Values</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {parentValues.map((parentValue) => {
                  const isCurrent = activeParentValueId === parentValue.id.toString();
                  return (
                    <button
                      key={parentValue.id}
                      type="button"
                      onClick={() => setActiveParentValueId(parentValue.id.toString())}
                      className={cn(
                        "px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-300 ease-out border md:flex-1 md:max-w-fit text-center",
                        isCurrent
                          ? "bg-primary text-white border-primary shadow-md shadow-primary/25 scale-105"
                          : "bg-white text-gray-600 border-gray-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                      )}
                    >
                      {parentValue.value_en}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {parentSpecification && parentValues.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 bg-amber-50 border border-amber-100 rounded-2xl text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3">
                <Layers className="w-6 h-6" />
              </div>
              <p className="font-semibold text-amber-900">Missing Parent Values</p>
              <p className="text-sm text-amber-700 mt-1">
                Please add values to the <strong>{parentSpecification.name_en}</strong> specification first.
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
                {!!parentSpecification && !activeParentValueId
                  ? "Select a parent value above to start adding values."
                  : "Start building your specification by adding its first value."}
              </p>
              <Button
                type="button"
                onClick={handleAddValueClick}
                disabled={!!parentSpecification && !activeParentValueId}
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
                      <TableHead width="8%" className="text-gray-500 font-medium">#</TableHead>
                      <TableHead width="41%">Name (EN)</TableHead>
                      <TableHead width="41%">Name (AR)</TableHead>
                      <TableHead width="10%">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {showNewValueRow && (
                      <NewValueRow
                        isAdding={false}
                        onSave={handleSaveNewValue}
                        onCancel={() => setShowNewValueRow(false)}
                      />
                    )}
                    <SortableContext
                      items={displayValues.map((value) => value.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {displayValues.map((value) => {
                        if (editingValueId === value.id) {
                          return (
                            <EditableValueRow
                              key={value.id}
                              value={value}
                              onSave={(data) => handleSaveEdit(value.id, data)}
                              onCancel={() => setEditingValueId(null)}
                            />
                          );
                        }

                        return (
                          <SortableValueRow
                            key={value.id}
                            value={value}
                            onEdit={handleEditValue}
                            onDelete={handleDeleteValue}
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

export default SpecificationForm;