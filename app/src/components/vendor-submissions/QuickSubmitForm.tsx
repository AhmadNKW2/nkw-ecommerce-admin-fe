"use client";

import { useMemo, useState } from "react";
import { Upload, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { mediaService } from "@/services/media/api/media.service";
import { showErrorToast } from "@/lib/toast";
import { useCreateVendorSubmission } from "@/services/vendor-submissions/hooks/use-vendor-submissions";

type FormLang = "ar" | "en";

type QuickSubmitFormProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
  /** When true, skip success toasts (vendor portal has no notifications). */
  silentSuccess?: boolean;
};

const COPY = {
  ar: {
    title: "إنشاء منتج",
    subtitle: "العنوان، الوصف، التكلفة، السعر، المخزون، وصور اختيارية.",
    productTitle: "عنوان المنتج",
    description: "الوصف",
    cost: "التكلفة",
    price: "السعر",
    stock: "كمية المخزون",
    addImages: "إضافة صور",
    cancel: "إلغاء",
    submit: "إرسال للمراجعة",
    submitting: "جاري الإرسال...",
    costMustBeValid: "التكلفة يجب أن تكون أكبر من أو تساوي صفر",
  },
  en: {
    title: "Create Product",
    subtitle: "Title, description, cost, price, stock, and optional images.",
    productTitle: "Product title",
    description: "Description",
    cost: "Cost",
    price: "Price",
    stock: "Stock quantity",
    addImages: "Add images",
    cancel: "Cancel",
    submit: "Submit for review",
    submitting: "Submitting...",
    costMustBeValid: "Cost must be ≥ 0",
  },
} as const;

export function QuickSubmitForm({
  onSuccess,
  onCancel,
  silentSuccess = true,
}: QuickSubmitFormProps) {
  const [lang, setLang] = useState<FormLang>("ar");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const createSubmission = useCreateVendorSubmission({ silent: silentSuccess });
  const copy = COPY[lang];

  const previews = useMemo(
    () =>
      files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [files],
  );

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    cost !== "" &&
    Number(cost) >= 0 &&
    price !== "" &&
    Number(price) >= 0 &&
    stock !== "" &&
    Number(stock) >= 0 &&
    !isUploading &&
    !createSubmission.isPending;

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCost("");
    setPrice("");
    setStock("");
    setFiles([]);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      let media: { media_id: number; is_primary?: boolean; sort_order?: number }[] =
        [];
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
        cost: Number(cost),
        stock: Number(stock),
        media,
      });
      resetForm();
      onSuccess?.();
    } catch (error) {
      showErrorToast(
        (error as Error)?.message || "Failed to submit product.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="!gap-4 !p-3 sm:!p-4 md:!p-5" dir="rtl">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
            {copy.title}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">{copy.subtitle}</p>
        </div>
        <div className="flex shrink-0 gap-1 self-start rounded-r1 border border-primary2/30 p-1">
          <button
            type="button"
            onClick={() => setLang("ar")}
            className={`rounded-r1 px-3 py-1.5 text-sm font-semibold transition-colors ${
              lang === "ar"
                ? "bg-primary2 text-white"
                : "text-primary2 hover:bg-primary2/10"
            }`}
          >
            AR
          </button>
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`rounded-r1 px-3 py-1.5 text-sm font-semibold transition-colors ${
              lang === "en"
                ? "bg-primary2 text-white"
                : "text-primary2 hover:bg-primary2/10"
            }`}
          >
            EN
          </button>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <Input
          label={copy.productTitle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          isRtl
        />
        <Textarea
          label={copy.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          minRows={4}
          isRtl
        />
        {/* In RTL, first grid item appears on the right: Cost → Price → Stock */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label={copy.cost}
            type="number"
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            isRtl
            error={
              cost !== "" && Number(cost) < 0 ? copy.costMustBeValid : undefined
            }
          />
          <Input
            label={copy.price}
            type="number"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            isRtl
          />
          <Input
            label={copy.stock}
            type="number"
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            isRtl
          />
        </div>

        <div className="min-w-0">
          <label className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-r1 border border-primary2 px-4 text-primary2 transition-all hover:bg-primary2 hover:text-white sm:h-13 sm:w-fit">
            <Upload className="h-5 w-5 shrink-0" />
            <span>{copy.addImages}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                }
              }}
            />
          </label>

          {previews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 sm:gap-3">
              {previews.map((preview, index) => (
                <div
                  key={preview.url}
                  className="relative h-20 w-20 overflow-hidden rounded border border-secondary bg-white sm:h-24 sm:w-24"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.url}
                    alt={preview.name}
                    className="h-full w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="absolute top-1 left-1 rounded-full bg-black/60 p-0.5 text-white"
                    aria-label={`Remove ${preview.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-start">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            color="var(--color-primary)"
            className="w-full !h-11 !whitespace-normal sm:w-auto sm:!h-13 sm:!whitespace-nowrap"
          >
            {createSubmission.isPending || isUploading
              ? copy.submitting
              : copy.submit}
          </Button>
          {onCancel ? (
            <Button
              variant="outline"
              onClick={onCancel}
              className="w-full !h-11 sm:w-auto sm:!h-13"
            >
              {copy.cancel}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
