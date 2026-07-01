import React, { useEffect } from "react";
import { MediaItem } from "../../../services/products/types/product-form.types";
import { Card } from "@/components/ui/card";
import { ImageUpload, ImageUploadItem } from "../../ui/image-upload";

interface MediaSectionProps {
  media: MediaItem[];
  onChange: (data: MediaItem[]) => void;
  errors?: Record<string, string | boolean>;
}

export function MediaSection({ media, onChange, errors }: MediaSectionProps) {
  const handleMediaChange = (items: ImageUploadItem[]) => {
    onChange(
      items.map((item) => ({
        id: item.id,
        file: item.file || null,
        preview: item.preview,
        type: item.type === "video" ? "video" : "image",
        order: item.order,
        isPrimary: item.isPrimary || false,
      })),
    );
  };

  const mediaItems: ImageUploadItem[] = media.map((m) => ({
    id: m.id,
    file: m.file || undefined,
    preview: m.preview,
    type: m.type,
    order: m.order,
    isPrimary: m.isPrimary,
  }));

  return (
    <Card className={`p-6 ${errors?.media ? "border-danger ring-1 ring-danger/30" : ""}`}>
      <h2 className="text-xl font-semibold">
        Product Media
      </h2>
      <ImageUpload
        value={mediaItems}
        onChange={handleMediaChange}
        hasPrimary
        error={
          errors?.media
            ? typeof errors.media === "string"
              ? errors.media
              : "At least one media item is required"
            : undefined
        }
      />
    </Card>
  );
}
