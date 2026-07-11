import React, { useRef, useState } from "react";
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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, FileText, Upload } from "lucide-react";
import { Button } from "./button";

export interface FileUploadItem {
  id: string;
  file: File | null;
  name: string;
  size?: number;
  url?: string;
  order: number;
}

export interface FileUploadProps {
  id?: string;
  value?: FileUploadItem[] | null;
  onChange?: (items: FileUploadItem[]) => void;
  maxFiles?: number;
  maxFileSizeBytes?: number;
  accept?: string;
  placeholder?: string;
  className?: string;
  error?: string;
  label?: string;
}

const DEFAULT_MAX_FILES = 3;
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileExtension = (name: string) => {
  const parts = name.split(".");
  if (parts.length < 2) return "FILE";
  return parts[parts.length - 1].toUpperCase();
};

interface SortablePropertyFileItemProps {
  item: FileUploadItem;
  onRemove: (id: string) => void;
  onPreview?: (url: string) => void;
}

const SortablePropertyFileItem = ({
  item,
  onRemove,
  onPreview,
}: SortablePropertyFileItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : "auto",
  };

  const previewUrl = item.url || (item.file ? URL.createObjectURL(item.file) : "");

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="w-40 h-40 relative group border rounded-r1 overflow-hidden border-primary/20 bg-white"
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-r1 bg-primary/10 text-primary">
          <FileText className="h-6 w-6" />
        </div>
        <p className="line-clamp-2 text-xs font-medium text-primary">{item.name}</p>
        <p className="text-[11px] text-third">
          {getFileExtension(item.name)}
          {item.size ? ` • ${formatFileSize(item.size)}` : ""}
        </p>
      </div>

      <div className="flex justify-center items-center gap-1 absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
        {onPreview && previewUrl ? (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onPreview(previewUrl);
            }}
            className="bg-primary/50 p-3 rounded-r1 text-sm transition-all duration-300 ease-in-out hover:bg-primary/75 active:bg-primary/90 group/preview"
          >
            <Eye className="text-primary3 group-hover/preview:text-white transition-all duration-300" />
          </button>
        ) : null}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          className="absolute top-2 right-2 bg-danger w-6 h-6 flex justify-center items-center text-white rounded text-md hover:bg-danger2"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export const FileUpload: React.FC<FileUploadProps> = ({
  id,
  value = [],
  onChange,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSizeBytes = DEFAULT_MAX_SIZE,
  accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.json,.xml",
  placeholder = "or drag and drop property files here",
  className = "",
  error,
  label,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentValue = value || [];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleAdd = (files: FileList | null) => {
    if (!files || files.length === 0 || !onChange) return;

    const nextItems = [...currentValue];
    const errors: string[] = [];

    Array.from(files).forEach((file, index) => {
      if (nextItems.length >= maxFiles) {
        errors.push(`You can upload up to ${maxFiles} property files.`);
        return;
      }

      if (file.size > maxFileSizeBytes) {
        errors.push(
          `${file.name} exceeds the ${formatFileSize(maxFileSizeBytes)} limit.`,
        );
        return;
      }

      nextItems.push({
        id: `property-file-${Date.now()}-${index}`,
        file,
        name: file.name,
        size: file.size,
        order: nextItems.length,
      });
    });

    if (errors.length > 0) {
      window.alert(errors.join("\n"));
    }

    if (nextItems.length !== currentValue.length) {
      onChange(nextItems.map((item, index) => ({ ...item, order: index })));
    }
  };

  const handleRemove = (fileId: string) => {
    if (!onChange) return;

    const filtered = currentValue
      .filter((item) => item.id !== fileId)
      .map((item, index) => ({ ...item, order: index }));

    onChange(filtered);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (!onChange) return;

    const reordered = [...currentValue];
    const [movedItem] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedItem);
    onChange(reordered.map((item, index) => ({ ...item, order: index })));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && currentValue.length > 0) {
      const oldIndex = currentValue.findIndex((item) => item.id === active.id);
      const newIndex = currentValue.findIndex((item) => item.id === over.id);
      handleReorder(oldIndex, newIndex);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleAdd(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleAdd(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePreview = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const canAddMore = currentValue.length < maxFiles;

  return (
    <div id={id} className={`flex flex-col gap-2 ${className}`}>
      {label ? <label className="text-sm font-medium">{label}</label> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {currentValue.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-r1 p-8 text-center transition-colors ${
            dragOver
              ? "border-primary bg-primary/10"
              : "border-primary/20 hover:border-primary hover:bg-primary/10 hover:cursor-pointer"
          } ${error ? "border-danger" : ""}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />

          <Upload className="mx-auto mb-3 bg-primary/10 p-2 w-10 h-10 rounded-r2 text-primary" />

          <div>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              color="var(--color-primary)"
            >
              Choose Files
            </Button>
            <p className="text-sm text-primary mt-2">{placeholder}</p>
            <p className="text-xs text-third mt-1">
              Up to {maxFiles} files, {formatFileSize(maxFileSizeBytes)} each
            </p>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={currentValue.map((item) => item.id)}
            strategy={rectSortingStrategy}
          >
            <div
              className="flex flex-wrap gap-5 min-h-[160px] p-2 border border-dashed border-transparent hover:border-gray-200"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                handleDrop(e);
                setDragOver(false);
              }}
            >
              {canAddMore ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-40 h-40 flex flex-col justify-center items-center border-2 border-dashed border-primary/20 hover:border-primary hover:bg-primary/10 rounded-r1 cursor-pointer transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={accept}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="mb-2 w-8 h-8 text-primary/50" />
                  <span className="text-sm text-primary font-medium text-center px-2">
                    Add or Drop Property File
                  </span>
                </div>
              ) : null}

              {currentValue.map((item) => (
                <SortablePropertyFileItem
                  key={item.id}
                  item={item}
                  onRemove={handleRemove}
                  onPreview={handlePreview}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default FileUpload;
