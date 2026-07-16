"use client";

import { useMemo, useState } from "react";
import { Sparkles, Upload, X } from "lucide-react";
import { PageHeader } from "../src/components/common/PageHeader";
import { Card } from "../src/components/ui/card";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { Textarea } from "../src/components/ui/textarea";
import { Badge } from "../src/components/ui/badge";
import { EmptyState } from "../src/components/common/EmptyState";
import { mediaService } from "../src/services/media/api/media.service";
import {
  finishToastError,
  finishToastSuccess,
  showLoadingToast,
} from "../src/lib/toast";
import {
  useCreateVendorSubmission,
  useVendorSubmissions,
} from "../src/services/vendor-submissions/hooks/use-vendor-submissions";
import type {
  VendorSubmission,
  VendorSubmissionStatus,
} from "../src/services/vendor-submissions/types/vendor-submission.types";

const STATUS_LABELS: Record<VendorSubmissionStatus, string> = {
  pending_ai: "Queued for AI",
  ai_processing: "AI processing",
  awaiting_brand: "Awaiting brand approval",
  awaiting_category: "Awaiting category approval",
  awaiting_category_specs: "Awaiting category setup",
  ready: "Ready",
  materialized: "Published to catalog",
  rejected: "Rejected",
  failed: "Failed",
};

function statusVariant(status: VendorSubmissionStatus) {
  switch (status) {
    case "materialized":
    case "ready":
      return "success" as const;
    case "rejected":
    case "failed":
      return "danger" as const;
    case "ai_processing":
    case "pending_ai":
      return "default" as const;
    default:
      return "warning" as const;
  }
}

export default function QuickSubmitPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [stock, setStock] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const createSubmission = useCreateVendorSubmission();
  const { data, isLoading, refetch } = useVendorSubmissions(
    { page: 1, limit: 20 },
    { refetchInterval: 15000 },
  );

  const submissions = (data?.data ?? []) as VendorSubmission[];

  const previews = useMemo(
    () => files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [files],
  );

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    price !== "" &&
    Number(price) >= 0 &&
    stock !== "" &&
    Number(stock) >= 0 &&
    !isUploading &&
    !createSubmission.isPending;

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setStock("");
    setFiles([]);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const toastId = showLoadingToast("Uploading media and submitting...");
    try {
      let media: { media_id: number; is_primary?: boolean; sort_order?: number }[] = [];
      if (files.length > 0) {
        setIsUploading(true);
        const uploaded = await mediaService.uploadMultipleMedia(files);
        media = uploaded.map((item, index) => ({
          media_id: item.id,
          is_primary: index === 0,
          sort_order: index,
        }));
      }
      await createSubmission.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        stock: Number(stock),
        media,
      });
      finishToastSuccess(toastId, "Submission sent to AI.");
      resetForm();
      refetch();
    } catch (error) {
      finishToastError(
        toastId,
        (error as Error)?.message || "Failed to submit product.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Sparkles />}
        title="Quick Submit"
        description="Send a minimal product to AI. It writes the bilingual name, description, and maps brand, category, specs and attributes for admin review."
      />

      <Card>
        <div className="flex flex-col gap-4">
          <Input
            label="Product title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            minRows={4}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <Input
              label="Stock quantity"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 w-fit cursor-pointer px-4 h-13 rounded-r1 border border-primary2 text-primary2 hover:bg-primary2 hover:text-white transition-all">
              <Upload className="w-5 h-5" />
              <span>Add images</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>

            {previews.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {previews.map((preview, index) => (
                  <div
                    key={preview.url}
                    className="relative w-24 h-24 rounded border border-secondary overflow-hidden bg-white"
                  >
                    <img
                      src={preview.url}
                      alt={preview.name}
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              color="var(--color-primary)"
            >
              {createSubmission.isPending || isUploading
                ? "Submitting..."
                : "Submit for AI review"}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-4">My submissions</h2>
        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={<Sparkles />}
            title="No submissions yet"
            description="Submit a product above to get started."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="flex items-center justify-between gap-4 p-3 rounded border border-secondary/40"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{submission.title}</div>
                  <div className="text-sm text-gray-500">
                    Price {submission.price} · Stock {submission.stock}
                  </div>
                  {submission.status === "materialized" &&
                    submission.product_id && (
                      <div className="text-xs text-success">
                        Product #{submission.product_id} created
                      </div>
                    )}
                  {submission.error && (
                    <div className="text-xs text-danger">{submission.error}</div>
                  )}
                </div>
                <Badge variant={statusVariant(submission.status)}>
                  {STATUS_LABELS[submission.status]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
