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
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4 text-emerald-900 border-b border-emerald-100 pb-2">
        Product Media
      </h2>
      <div className="mt-4">
        <ImageUpload
          value={mediaItems}
          onChange={handleMediaChange}
          hasPrimary
        />
      </div>
      {errors && errors["media"] && (
        <p className="text-sm text-red-500 mt-2">{String(errors["media"])}</p>
      )}
    </Card>
  );
}
