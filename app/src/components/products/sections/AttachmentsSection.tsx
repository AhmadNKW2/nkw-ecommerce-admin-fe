import React from "react";
import { AttachmentItem } from "../../../services/products/types/product-form.types";
import { Card } from "@/components/ui/card";
import { FileUpload, FileUploadItem } from "../../ui/file-upload";

interface AttachmentsSectionProps {
  attachments: AttachmentItem[];
  onChange: (data: AttachmentItem[]) => void;
  errors?: Record<string, string | boolean>;
}

export function AttachmentsSection({
  attachments,
  onChange,
  errors,
}: AttachmentsSectionProps) {
  const handleChange = (items: FileUploadItem[]) => {
    onChange(
      items.map((item) => ({
        id: item.id,
        file: item.file || null,
        name: item.name,
        size: item.size,
        url: item.url,
        order: item.order,
      })),
    );
  };

  const uploadItems: FileUploadItem[] = attachments.map((attachment) => ({
    id: attachment.id,
    file: attachment.file ?? null,
    name: attachment.name,
    size: attachment.size,
    url: attachment.url,
    order: attachment.order,
  }));

  return (
    <Card
      className={`p-6 ${
        errors?.attachments ? "border-danger ring-1 ring-danger/30" : ""
      }`}
    >
      <h2 className="text-xl font-semibold">Product Property Files</h2>
      <FileUpload
        value={uploadItems}
        onChange={handleChange}
        maxFiles={3}
        maxFileSizeBytes={5 * 1024 * 1024}
        placeholder="or drag and drop property files here"
        error={
          errors?.attachments
            ? typeof errors.attachments === "string"
              ? errors.attachments
              : "Invalid property files"
            : undefined
        }
      />
    </Card>
  );
}
