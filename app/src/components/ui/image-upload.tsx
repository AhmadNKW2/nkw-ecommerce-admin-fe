import React, { useState } from "react";
import Image from "next/image";
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
import { BadgeCheck, Eye, Star, Upload, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { Modal } from "./modal";

export interface ImageUploadItem {
  id: string;
  file?: File;
  preview: string;
  type: "image" | "video";
  isPrimary?: boolean;
  order: number;
}

// Legacy type for backward compatibility
export interface UploadedImage {
  file: File | null;
  preview: string;
}

interface SortableImageItemProps {
  item: ImageUploadItem;
  onRemove: (id: string) => void;
  onSetPrimary?: (id: string) => void;
  onPreview?: (url: string) => void;
  hasPrimary?: boolean;
}

const SortableImageItem = ({
  item,
  onRemove,
  onSetPrimary,
  onPreview,
  hasPrimary,
}: SortableImageItemProps) => {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`w-40 h-40 relative group border rounded-r1 overflow-hidden border-primary/20 ${hasPrimary && item.type === "image" && item.isPrimary ? "border-primary ring-2 ring-primary" : ""} `}
    >
      {item.type === "image" ? (
        <Image
          src={item.preview}
          alt=""
          fill
          className="object-cover rounded-r1"
        />
      ) : (
        <video src={item.preview} className="object-cover w-full h-full" />
      )}

      {/* {hasPrimary && item.isPrimary && (
                <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded z-10">
                    Primary
                </div>
            )} */}

      <div className="flex justify-center items-center gap-1 absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
        {hasPrimary &&
          onSetPrimary &&
          item.type === "image" &&
          !item.isPrimary && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onSetPrimary(item.id);
              }}
              className="bg-primary/50 p-3 rounded-r1 text-sm transition-all duration-300 ease-in-out hover:bg-primary/75 active:bg-primary/90 group/primary"
            >
              <BadgeCheck className="text-primary3 group-hover/primary:text-white transition-all duration-300" />
            </button>
          )}
        {onPreview && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onPreview(item.preview);
            }}
            className="bg-primary/50 p-3 rounded-r1 text-sm transition-all duration-300 ease-in-out hover:bg-primary/75 active:bg-primary/90 group/preview"
          >
            <Eye className="text-primary3 group-hover/preview:text-white transition-all duration-300" />
          </button>
        )}
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

export interface ImageUploadProps {
  /** ID for the component */
  id?: string;
  /** Current media items (for multi mode) */
  value?: ImageUploadItem[] | null;
  /** Callback when media changes (for multi mode) */
  onChange?: (media: ImageUploadItem[]) => void;
  /** Allow multiple file uploads */
  isMulti?: boolean;
  /** Enable primary image selection */
  hasPrimary?: boolean;
  /** Enable group primary selection */
  /** Auto-set item primary when adding the first file (only within this upload list) */
  autoSetPrimaryOnFirstAdd?: boolean;
  /** Accept file types */
  accept?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show preview modal */
  showPreview?: boolean;
  /** Custom class name */
  className?: string;
  /** Error state */
  error?: string;
  /** Label for the field */
  label?: string;
  /** Preview size for single image mode */
  previewSize?: "sm" | "md" | "lg";
  /** Disable internal DndContext (useful when wrapping multiple ImageUploads in a single DndContext) */
  disableInternalDnd?: boolean;
  /** Custom SortableContext ID (only useful if disableInternalDnd is true) */
  sortableContextId?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  id,
  value = [],
  onChange,
  isMulti = true,
  hasPrimary = false,
  autoSetPrimaryOnFirstAdd = true,
  accept = "image/*,video/*",
  placeholder = "or drag and drop images/videos here",
  showPreview = true,
  className = "",
  error,
  label,
  previewSize = "md",
  disableInternalDnd = false,
  sortableContextId,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const currentValue = value || [];
  const hasSingleImage = !isMulti && currentValue.length > 0;
  const singleImage = hasSingleImage ? currentValue[0] : null;

  const getFirstImageId = (items: ImageUploadItem[]) =>
    [...items]
      .sort((a, b) => a.order - b.order)
      .find((item) => item.type === "image")?.id;

  const normalizePrimaryImageState = (
    items: ImageUploadItem[],
    fallbackPrimaryImageId?: string,
  ) => {
    if (!hasPrimary) {
      return items;
    }

    const currentPrimaryImageId = items.find(
      (item) => item.isPrimary && item.type === "image",
    )?.id;
    const primaryImageId = currentPrimaryImageId ?? fallbackPrimaryImageId;

    return items.map((item) => ({
      ...item,
      isPrimary:
        !!primaryImageId && item.type === "image" && item.id === primaryImageId,
    }));
  };

  const sizeClasses = {
    sm: "w-24 h-24",
    md: "w-40 h-40",
    lg: "w-40 h-40",
  };

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

    const filesToProcess = isMulti ? Array.from(files) : [files[0]];

    const newMediaItems: ImageUploadItem[] = filesToProcess.map(
      (file, index) => ({
        id: `media-${Date.now()}-${index}`,
        file: file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith("video") ? "video" : "image",
        isPrimary: false,
        order: currentValue.length + index,
      }),
    );

    const nextItems = isMulti
      ? [...currentValue, ...newMediaItems]
      : newMediaItems;
    const updatedItems = normalizePrimaryImageState(
      nextItems,
      autoSetPrimaryOnFirstAdd ? getFirstImageId(nextItems) : undefined,
    );

    if (isMulti) {
      onChange(updatedItems);
    } else {
      // For single mode, replace existing
      currentValue.forEach((m) => URL.revokeObjectURL(m.preview));
      onChange(updatedItems);
    }
  };

  const handleRemove = (mediaId: string) => {
    if (!onChange) return;

    const mediaToRemove = currentValue.find((m) => m.id === mediaId);
    if (mediaToRemove) {
      URL.revokeObjectURL(mediaToRemove.preview);
    }

    let filtered = currentValue.filter((m) => m.id !== mediaId);

    if (hasPrimary && filtered.length > 0) {
      filtered = normalizePrimaryImageState(
        filtered,
        getFirstImageId(filtered),
      );
    }

    onChange(filtered);
  };

  const handleSetPrimary = (mediaId: string) => {
    if (!hasPrimary || !onChange) return;

    const targetMedia = currentValue.find((m) => m.id === mediaId);
    if (!targetMedia || targetMedia.type !== "image") return;

    let updated = currentValue.map((m) => ({
      ...m,
      isPrimary: m.type === "image" && m.id === mediaId,
    }));

    const targetIndex = updated.findIndex((m) => m.id === mediaId);
    if (targetIndex > 0) {
      const [movedItem] = updated.splice(targetIndex, 1);
      updated.unshift(movedItem);
      updated = updated.map((m, idx) => ({ ...m, order: idx }));
    }

    onChange(updated);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (!isMulti || !onChange) return;

    const reordered = [...currentValue];
    const [movedItem] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedItem);

    const updated = reordered.map((m, idx) => ({ ...m, order: idx }));
    onChange(updated);
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

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleAdd(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    handleAdd(files);
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div id={id} className={`flex flex-col gap-5 ${className}`}>
      {label && <label className="text-sm font-medium">{label}</label>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Single Image Mode - Show image inside dashed border */}
      {!isMulti && hasSingleImage && singleImage ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-r1 p-4 text-center transition-colors flex flex-col items-center justify-center gap-4 ${
            dragOver
              ? "border-primary bg-primary/10"
              : "border-primary/20 hover:border-primary hover:bg-primary/10 hover:cursor-pointer"
          } ${error ? "border-danger" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />

          <div
            className={`${sizeClasses[previewSize]} relative group rounded-r1 overflow-hidden border border-primary/20`}
          >
            {singleImage.type === "image" ? (
              <Image
                src={singleImage.preview}
                alt=""
                fill
                className="object-cover rounded-r1"
              />
            ) : (
              <video
                src={singleImage.preview}
                className="object-cover w-full h-full rounded-r1"
              />
            )}

            {/* Hover overlay with buttons */}
            <div className="flex justify-center items-center gap-2 absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="bg-secondary/50 p-3 rounded-r1 text-sm transition-all duration-300 ease-in-out hover:bg-secondary/75 active:bg-secondary/90 group/secondary"
              >
                <RefreshCw className="text-secondary group-hover/secondary:text-white transition-all duration-300" />
              </button>

              {showPreview && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImage(singleImage.preview);
                  }}
                  className="bg-primary/50 p-3 rounded-r1 text-sm transition-all duration-300 ease-in-out hover:bg-primary/75 active:bg-primary/90 group/preview"
                >
                  <Eye className="text-primary3 group-hover/preview:text-white transition-all duration-300" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(singleImage.id);
                }}
                className="absolute top-2 right-2 bg-danger w-6 h-6 flex justify-center items-center text-white rounded text-md hover:bg-danger2"
              >
                &times;
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Hover over image to preview or change
          </p>
        </div>
      ) : (
        /* Upload Zone - Show when no image (single mode) or always (multi mode) */
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
          } ${error ? "border-danger" : ""} ${disableInternalDnd && isMulti ? "hidden" : ""}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple={isMulti}
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
              {isMulti ? "Choose Files" : "Choose File"}
            </Button>
            <p className="text-sm text-primary mt-2">{placeholder}</p>
          </div>
        </div>
      )}

      {/* Media Grid - Only for multi mode */}
      {isMulti &&
        (disableInternalDnd ? (
          <SortableContext
            id={sortableContextId}
            items={currentValue.map((m) => m.id)}
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
              {/* Simple add media button inside the grid so the group isn't completely empty and can receive drops/clicks */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-40 h-40 flex flex-col justify-center items-center border-2 border-dashed border-primary/20 hover:border-primary hover:bg-primary/10 rounded-r1 cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple={isMulti}
                  accept={accept}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="mb-2 w-8 h-8 text-primary/50" />
                <span className="text-sm text-primary font-medium text-center px-2">
                  Add or Drop Media
                </span>
              </div>

              {currentValue.map((item) => (
                <SortableImageItem
                  key={item.id}
                  item={item}
                  onRemove={handleRemove}
                  onSetPrimary={hasPrimary ? handleSetPrimary : undefined}
                  onPreview={showPreview ? setPreviewImage : undefined}
                  hasPrimary={hasPrimary}
                />
              ))}
            </div>
          </SortableContext>
        ) : currentValue.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={currentValue.map((m) => m.id)}
              strategy={rectSortingStrategy}
            >
              <div className="flex flex-wrap gap-5">
                {currentValue.map((item) => (
                  <SortableImageItem
                    key={item.id}
                    item={item}
                    onRemove={handleRemove}
                    onSetPrimary={hasPrimary ? handleSetPrimary : undefined}
                    onPreview={showPreview ? setPreviewImage : undefined}
                    hasPrimary={hasPrimary}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : null)}

      {/* Preview Modal */}
      {showPreview && (
        <Modal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          variant="transparent"
        >
          {previewImage && (
            <div className="relative w-[650px] h-[650px] border-2 border-white bg-white/50 rounded-r1">
              <Image
                src={previewImage}
                alt="Preview"
                fill
                className="object-contain rounded-r1"
              />
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default ImageUpload;
