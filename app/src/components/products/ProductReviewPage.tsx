"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Boxes,
  Check,
  CheckCircle2,
  ExternalLink,
  ImageOff,
  Loader2,
  Package,
  PencilLine,
  RefreshCw,
  Shield,
  Sparkles,
  Store,
  Tag,
  TriangleAlert,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { CategoryTreeSelect } from "@/components/products/CategoryTreeSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { useSessionStoragePage } from "@/hooks/use-session-storage-page";
import { useResolvedFeatureToggles } from "@/hooks/use-resolved-feature-toggles";
import { useLoading } from "@/providers/loading-provider";
import { useCategories } from "@/services/categories/hooks/use-categories";
import {
  usePermanentDeleteProduct,
  useProducts,
  useUpdateProduct,
  useUpdateProductWorkflowStatus,
} from "@/services/products/hooks/use-products";
import {
  Product,
  ProductFilters,
  UpdateProductDto,
} from "@/services/products/types/product.types";
import { useVendors } from "@/services/vendors/hooks/use-vendors";

type ProductLike = Product & Record<string, any>;

type PriceSummary = {
  price: string | null;
  salePrice: string | null;
};

type EditablePriceFields = {
  price: string;
  salePrice: string;
};

type ProductChip = {
  label: string;
  colorCode?: string | null;
};

type ProductGroup = {
  label: string;
  values: ProductChip[];
};

type ReviewSnapshot = {
  imageUrl: string | null;
  displayPrice: PriceSummary | null;
  visible: boolean;
  outOfStock: boolean;
  previewUrl: string | null;
  referenceUrl: string | null;
  attributes: ProductGroup[];
  specifications: ProductGroup[];
};

type QueueItem = {
  product: Product;
  snapshot: ReviewSnapshot;
};

type PriceOverride = {
  price: number;
  salePrice: number | null;
};

type PriceCandidate = {
  raw: string;
  numericValue: number;
};

const REVIEW_STORAGE_KEY = "products_review";
const REVIEW_FILTERS_STORAGE_KEY = `${REVIEW_STORAGE_KEY}_filters`;

const formatPriceValue = (value: number) => {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const toPriceCandidate = (value: unknown): PriceCandidate | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return {
    raw: formatPriceValue(numericValue),
    numericValue,
  };
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const getDisplayText = (...candidates: unknown[]) => {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }

    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }

  return null;
};

const dedupeChips = (chips: ProductChip[]) => {
  const unique = new Map<string, ProductChip>();

  chips.forEach((chip) => {
    const key = `${chip.label}|${chip.colorCode ?? ""}`;
    if (!unique.has(key)) {
      unique.set(key, chip);
    }
  });

  return Array.from(unique.values());
};

const normalizeExternalUrl = (value?: string | null) => {
  if (!value || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const extractChips = (source: unknown): ProductChip[] => {
  if (!source) {
    return [];
  }

  if (Array.isArray(source)) {
    return dedupeChips(source.flatMap((entry) => extractChips(entry)));
  }

  const record = asRecord(source);
  if (record) {
    const label = getDisplayText(
      record.name_en,
      record.name_ar,
      record.value_en,
      record.value_ar,
      record.name,
      record.label,
      record.value
    );

    if (label) {
      return [
        {
          label,
          colorCode: getDisplayText(record.color_code),
        },
      ];
    }

    return dedupeChips(Object.values(record).flatMap((entry) => extractChips(entry)));
  }

  const primitiveLabel = getDisplayText(source);
  return primitiveLabel ? [{ label: primitiveLabel }] : [];
};

const normalizeAttributeGroups = (source: unknown): ProductGroup[] => {
  if (!source) {
    return [];
  }

  const groups: ProductGroup[] = [];

  const pushGroup = (label: string, values: ProductChip[]) => {
    const nextValues = dedupeChips(values);
    if (!label || nextValues.length === 0) {
      return;
    }

    groups.push({ label, values: nextValues });
  };

  if (Array.isArray(source)) {
    source.forEach((entry, index) => {
      const record = asRecord(entry);
      if (!record) {
        return;
      }

      const label =
        getDisplayText(
          record.name_en,
          record.name_ar,
          record.name,
          record.label,
          asRecord(record.attribute)?.name_en,
          asRecord(record.attribute)?.name_ar,
          asRecord(record.attribute)?.name,
          asRecord(record.attribute)?.label
        ) ?? `Attribute ${index + 1}`;

      const values = extractChips(
        record.values ?? record.attribute_values ?? record.selected_values ?? record.value
      );

      pushGroup(label, values);
    });

    return groups;
  }

  const sourceRecord = asRecord(source);
  if (!sourceRecord) {
    return [];
  }

  Object.entries(sourceRecord).forEach(([key, entry]) => {
    const record = asRecord(entry);
    if (!record) {
      return;
    }

    const label =
      getDisplayText(record.name_en, record.name_ar, record.name, record.label) ??
      `Attribute ${key}`;
    const values = extractChips(record.values ?? record.attribute_values ?? record.value);

    pushGroup(label, values);
  });

  return groups;
};

const normalizeSpecificationGroups = (source: unknown): ProductGroup[] => {
  if (!source) {
    return [];
  }

  const grouped = new Map<string, ProductChip[]>();

  const appendGroupValue = (label: string, chips: ProductChip[]) => {
    if (!label || chips.length === 0) {
      return;
    }

    const existing = grouped.get(label) ?? [];
    grouped.set(label, dedupeChips([...existing, ...chips]));
  };

  if (Array.isArray(source)) {
    source.forEach((entry, index) => {
      const record = asRecord(entry);
      if (!record) {
        return;
      }

      const specification = asRecord(record.specification);
      const specificationValue = asRecord(record.specification_value) ?? record;

      const label =
        getDisplayText(
          specification?.name_en,
          specification?.name_ar,
          record.specification_name_en,
          record.specification_name_ar,
          record.name_en,
          record.name_ar,
          specificationValue?.specification_name_en,
          specificationValue?.specification_name_ar
        ) ??
        `Specification ${getDisplayText(specificationValue?.specification_id) ?? index + 1}`;

      appendGroupValue(label, extractChips(specificationValue));
    });

    return Array.from(grouped.entries()).map(([label, values]) => ({ label, values }));
  }

  const sourceRecord = asRecord(source);
  if (!sourceRecord) {
    return [];
  }

  Object.entries(sourceRecord).forEach(([key, entry]) => {
    const record = asRecord(entry);
    if (!record) {
      return;
    }

    const label =
      getDisplayText(record.name_en, record.name_ar, record.name, record.label) ??
      `Specification ${key}`;
    appendGroupValue(label, extractChips(record.values ?? record.value));
  });

  return Array.from(grouped.entries()).map(([label, values]) => ({ label, values }));
};

const getProductGalleryUrls = (product: ProductLike) => {
  const urls = new Set<string>();

  if (product.primary_image?.url) {
    urls.add(product.primary_image.url);
  }

  if (typeof product.image === "string" && product.image.trim()) {
    urls.add(product.image);
  }

  const directMedia = Array.isArray(product.media) ? [...product.media] : [];
  directMedia
    .sort((left: any, right: any) => (left?.sort_order ?? 0) - (right?.sort_order ?? 0))
    .forEach((mediaItem: any) => {
      if (mediaItem?.url) {
        urls.add(mediaItem.url);
      }
    });

  if (product.media_groups && typeof product.media_groups === "object") {
    Object.values(product.media_groups).forEach((group: any) => {
      const groupMedia = Array.isArray(group?.media) ? [...group.media] : [];
      groupMedia
        .sort((left: any, right: any) => (left?.sort_order ?? 0) - (right?.sort_order ?? 0))
        .forEach((mediaItem: any) => {
          if (mediaItem?.url) {
            urls.add(mediaItem.url);
          }
        });
    });
  }

  return Array.from(urls);
};

const getProductImageUrl = (product: ProductLike) => {
  return getProductGalleryUrls(product)[0] ?? null;
};

const resolveProductPriceCandidates = (product: ProductLike) => {
  let price: PriceCandidate | null = null;
  let salePrice: PriceCandidate | null = null;

  if (product.price !== null && product.price !== undefined && product.price !== "") {
    const legacyPrice = product.price as any;
    if (typeof legacyPrice === "object") {
      price = toPriceCandidate(legacyPrice.price);
      salePrice = toPriceCandidate(product.sale_price ?? legacyPrice.sale_price);
    } else {
      price = toPriceCandidate(legacyPrice);
      salePrice = toPriceCandidate(product.sale_price);
    }
  } else if (product.sale_price !== null && product.sale_price !== undefined && product.sale_price !== "") {
    salePrice = toPriceCandidate(product.sale_price);
  }

  if (!price && !salePrice && product.variants?.length && product.price_groups) {
    const firstVariant = product.variants[0];
    const priceGroup = product.price_groups[firstVariant.price_group_id];
    if (priceGroup) {
      price = toPriceCandidate(priceGroup.price);
      salePrice = toPriceCandidate(priceGroup.sale_price);
    }
  } else if (!price && !salePrice && product.price_groups) {
    const firstGroup = product.price_groups[Object.keys(product.price_groups)[0]];
    if (firstGroup) {
      price = toPriceCandidate(firstGroup.price);
      salePrice = toPriceCandidate(firstGroup.sale_price);
    }
  }

  return { price, salePrice };
};

const getProductDisplayPrice = (product: ProductLike): PriceSummary | null => {
  const { price, salePrice } = resolveProductPriceCandidates(product);
  const normalizedSalePrice =
    price && salePrice && price.numericValue === salePrice.numericValue ? null : salePrice;

  if (!price && !normalizedSalePrice) {
    return null;
  }

  return {
    price: price?.raw ?? normalizedSalePrice?.raw ?? null,
    salePrice: normalizedSalePrice?.raw ?? null,
  };
};

const getEditablePriceFields = (product: ProductLike): EditablePriceFields => {
  const { price, salePrice } = resolveProductPriceCandidates(product);

  if (!price && salePrice) {
    return {
      price: String(salePrice.numericValue),
      salePrice: "",
    };
  }

  return {
    price: price ? String(price.numericValue) : "",
    salePrice: salePrice ? String(salePrice.numericValue) : "",
  };
};

const isProductOutOfStock = (product: ProductLike) => {
  return product.variants?.length
    ? product.variants.every((variant: any) => variant.is_out_of_stock === true)
    : product.is_out_of_stock === true;
};

const getCategoryName = (product: ProductLike) => {
  return product.categories?.[0]?.name_en || product.category?.name_en || null;
};

const getVendorName = (product: ProductLike) => {
  return product.vendor?.name_en || product.vendor?.name || null;
};

const getBrandName = (product: ProductLike) => {
  return product.brand?.name_en || product.brand?.name || null;
};

const formatProductTimestamp = (value?: string | Date | null) => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const isoMatch = value.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
    );

    if (isoMatch) {
      const [, year, month, day, hour, minute, second = "0"] = isoMatch;
      const localWallClockDate = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      );

      return {
        date: localWallClockDate.toLocaleDateString(),
        time: localWallClockDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    }
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return {
    date: parsedDate.toLocaleDateString(),
    time: parsedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
};

const buildReviewSnapshot = (product: ProductLike): ReviewSnapshot => {
  return {
    imageUrl: getProductImageUrl(product),
    displayPrice: getProductDisplayPrice(product),
    visible: Boolean(product.visible ?? product.is_active),
    outOfStock: isProductOutOfStock(product),
    previewUrl: product.slug ? `/products/${product.slug}` : null,
    referenceUrl: normalizeExternalUrl(product.reference_link),
    attributes: normalizeAttributeGroups(product.attributes),
    specifications: normalizeSpecificationGroups(product.specifications),
  };
};

const openExternalLink = (url?: string | null) => {
  if (!url) {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
};

const getLinkedProductIds = (product: ProductLike) => {
  const directIds = Array.isArray(product.linked_product_ids)
    ? product.linked_product_ids
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id !== product.id)
    : [];

  const relationIds = Array.isArray((product as any).linked_products)
    ? (product as any).linked_products
        .map((linkedProduct: any) => Number(linkedProduct?.id))
        .filter((id: number) => Number.isInteger(id) && id !== product.id)
    : [];

  return Array.from(new Set([...directIds, ...relationIds]));
};

const applyLocalPriceOverride = (product: ProductLike, override: PriceOverride): ProductLike => {
  return {
    ...product,
    price: String(override.price),
    sale_price: override.salePrice !== null ? String(override.salePrice) : null,
  };
};

function QueueStatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "primary" | "success" | "warning";
}) {
  const toneStyles = {
    primary: "border-primary/15 bg-white/85 text-primary",
    success: "border-success/20 bg-white/90 text-success",
    warning: "border-yellow-200 bg-white/90 text-yellow-700",
  };

  return (
    <div
      className={`rounded-[20px] border p-4 shadow-[0_14px_35px_-24px_rgba(15,23,42,0.35)] ${toneStyles[tone]}`}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
        {icon}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black tracking-tight text-gray-900">{value}</p>
      <p className="mt-1 text-sm leading-6 text-gray-600">{hint}</p>
    </div>
  );
}

function ProductMetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-primary/10 bg-white/92 px-4 py-4 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.45)]">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
        <span className="text-primary">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="text-[15px] font-semibold leading-6 text-gray-800">{value}</p>
    </div>
  );
}

function ReviewActionButton({
  icon,
  label,
  color,
  variant = "outline",
  disabled,
  onClick,
  href,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  color?: string;
  variant?: "outline" | "solid";
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  href?: string;
  className?: string;
}) {
  return (
    <Button
      variant={variant}
      color={color}
      disabled={disabled}
      onClick={onClick}
      href={href}
      isSquare={true}
      className={`h-11 w-11 rounded-2xl border-white/70 bg-white/92 p-0 shadow-[0_16px_28px_-22px_rgba(15,23,42,0.45)] backdrop-blur-sm hover:-translate-y-0.5 ${className ?? ""}`}
    >
      <span className="flex h-full w-full items-center justify-center">
        {icon}
        <span className="sr-only">{label}</span>
      </span>
    </Button>
  );
}

function ProductGroupSection({
  title,
  groups,
  emptyText,
  icon,
  badgeVariant,
  iconClassName,
  chipClassName,
}: {
  title: string;
  groups: ProductGroup[];
  emptyText: string;
  icon: React.ReactNode;
  badgeVariant?: "default" | "default2" | "primary" | "secondary" | "success" | "danger" | "warning";
  iconClassName: string;
  chipClassName: string;
}) {
  const totalValues = groups.reduce((sum, group) => sum + group.values.length, 0);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/10 bg-[linear-gradient(180deg,rgba(251,250,255,0.96),rgba(255,255,255,1))] p-4 shadow-[0_22px_45px_-34px_rgba(15,23,42,0.45)]">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/6 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ${iconClassName}`}>
            {icon}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              {title}
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-700">
              {groups.length > 0
                ? `${groups.length} groups • ${totalValues} selected values`
                : emptyText}
            </p>
          </div>
        </div>

        {groups.length > 0 ? <Badge variant={badgeVariant ?? "default2"}>{totalValues}</Badge> : null}
      </div>

      {groups.length === 0 ? (
        <div className="relative mt-5 rounded-[18px] border border-dashed border-primary/15 bg-white/80 px-4 py-5 text-center text-sm leading-6 text-gray-500">
          {emptyText}
        </div>
      ) : (
        <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <div
              key={group.label}
              className="rounded-[18px] border border-primary/10 bg-white/92 p-3 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.55)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">{group.label}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    {group.values.length} values
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {group.values.map((value) => (
                  <span
                    key={`${group.label}-${value.label}-${value.colorCode ?? ""}`}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold text-gray-700 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.45)] ${chipClassName}`}
                  >
                    {value.colorCode ? (
                      <span
                        className="h-3 w-3 rounded-full border border-black/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]"
                        style={{ backgroundColor: value.colorCode }}
                      />
                    ) : null}
                    <span>{value.label}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductReviewCard({
  item,
  onApprove,
  onSavePrice,
  onDelete,
  isApproving,
  isSavingPrice,
}: {
  item: QueueItem;
  onApprove: (productId: number) => Promise<void>;
  onSavePrice: (product: Product, values: PriceOverride) => Promise<void>;
  onDelete: (product: Product) => void;
  isApproving: boolean;
  isSavingPrice: boolean;
}) {
  const { product, snapshot } = item;
  const createdAt = formatProductTimestamp(product.created_at as string | Date | undefined);
  const categoryName = getCategoryName(product as ProductLike) ?? "No category assigned";
  const vendorName = getVendorName(product as ProductLike) ?? "No vendor assigned";
  const brandName = getBrandName(product as ProductLike) ?? "No brand assigned";
  const initialPriceFields = useMemo(
    () => getEditablePriceFields(product as ProductLike),
    [product]
  );
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceDraft, setPriceDraft] = useState(initialPriceFields.price);
  const [salePriceDraft, setSalePriceDraft] = useState(initialPriceFields.salePrice);
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditingPrice) {
      setPriceDraft(initialPriceFields.price);
      setSalePriceDraft(initialPriceFields.salePrice);
      setPriceError(null);
    }
  }, [initialPriceFields.price, initialPriceFields.salePrice, isEditingPrice]);

  const handleStartEditingPrice = () => {
    setPriceDraft(initialPriceFields.price);
    setSalePriceDraft(initialPriceFields.salePrice);
    setPriceError(null);
    setIsEditingPrice(true);
  };

  const handleCancelEditingPrice = () => {
    setPriceDraft(initialPriceFields.price);
    setSalePriceDraft(initialPriceFields.salePrice);
    setPriceError(null);
    setIsEditingPrice(false);
  };

  const handleSavePrice = async () => {
    const trimmedPrice = priceDraft.trim();
    const trimmedSalePrice = salePriceDraft.trim();

    if (!trimmedPrice) {
      setPriceError("Enter a valid store price before saving.");
      return;
    }

    const nextPrice = Number(trimmedPrice);
    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      setPriceError("Enter a valid store price before saving.");
      return;
    }

    let nextSalePrice: number | null = null;
    if (trimmedSalePrice) {
      const parsedSalePrice = Number(trimmedSalePrice);
      if (!Number.isFinite(parsedSalePrice) || parsedSalePrice < 0) {
        setPriceError("Enter a valid sale price or leave it empty.");
        return;
      }

      nextSalePrice = parsedSalePrice;
    }

    setPriceError(null);

    try {
      await onSavePrice(product, {
        price: nextPrice,
        salePrice: nextSalePrice,
      });
      setIsEditingPrice(false);
    } catch {
      setPriceError("Price update failed. Try again.");
    }
  };

  return (
    <Card className="gap-0 overflow-hidden border border-primary/10 p-0 shadow-[0_28px_65px_-40px_rgba(15,23,42,0.45)] transition-shadow hover:shadow-[0_32px_75px_-40px_rgba(15,23,42,0.55)]">
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(109,75,221,0.07),rgba(240,192,63,0.16),rgba(255,255,255,0.98))] p-5 md:p-6 md:pb-8">
        <div className="absolute -left-8 top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute right-0 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-secondary/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-1 flex-col gap-6 md:flex-row md:items-start">
            <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.65)] ring-1 ring-white/60">
              {snapshot.imageUrl ? (
                <Image
                  src={snapshot.imageUrl}
                  alt={product.name_en || "Product image"}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary/5 text-primary">
                  <ImageOff className="h-10 w-10 opacity-60" />
                </div>
              )}
              <div className="absolute left-3 top-3 rounded-full bg-black/85 px-3 py-1 text-xs font-bold text-white shadow-sm backdrop-blur-md">
                #{product.id}
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant={snapshot.visible ? "default2" : "danger"}>
                    {snapshot.visible ? "Visible" : "Hidden"}
                  </Badge>
                  <Badge variant={snapshot.outOfStock ? "warning" : "success"}>
                    {snapshot.outOfStock ? "Out of stock" : "In stock"}
                  </Badge>
                  <Badge variant={snapshot.referenceUrl ? "success" : "warning"}>
                    {snapshot.referenceUrl ? "Reference linked" : "Reference missing"}
                  </Badge>
                </div>
                <h2 className="text-2xl font-black leading-tight tracking-tight text-gray-900 md:text-[30px]">
                  {product.name_en || "Untitled product"}
                </h2>
                <p dir="rtl" className="mt-2.5 text-[17px] leading-relaxed text-gray-600">
                  {product.name_ar || "No Arabic name yet"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:w-[600px]">
                <ProductMetaItem icon={<Store className="h-4 w-4" />} label="Vendor" value={vendorName} />
                <ProductMetaItem icon={<Tag className="h-4 w-4" />} label="Brand" value={brandName} />
                <ProductMetaItem icon={<Boxes className="h-4 w-4" />} label="Category" value={categoryName} />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-5 xl:w-[360px]">
            <div className="flex items-center justify-end gap-2 rounded-[22px] border border-white/70 bg-white/78 p-2 shadow-[0_18px_30px_-26px_rgba(15,23,42,0.55)] backdrop-blur-sm self-end">
              <ReviewActionButton
                icon={<ExternalLink className="h-4 w-4" />}
                label="Open reference link"
                color="var(--color-primary2)"
                onClick={() => openExternalLink(snapshot.referenceUrl)}
                disabled={!snapshot.referenceUrl || isSavingPrice}
                className="border-primary/12 text-primary2 hover:bg-primary2 hover:text-white"
              />
              <ReviewActionButton
                icon={<PencilLine className="h-4 w-4" />}
                label="Open product editor"
                href={`/products/${product.id}`}
                color="#64748b"
                disabled={isSavingPrice}
                className="border-slate-200 text-slate-600 hover:bg-slate-600 hover:text-white"
              />
              <ReviewActionButton
                icon={<TriangleAlert className="h-4 w-4" />}
                label="Delete product permanently"
                color="var(--color-danger)"
                onClick={() => onDelete(product)}
                disabled={isApproving || isSavingPrice}
                className="border-danger/25 text-danger hover:bg-danger hover:text-white"
              />
              <ReviewActionButton
                icon={
                  isApproving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )
                }
                label="Approve and activate product"
                variant="solid"
                color="var(--color-success)"
                onClick={() => onApprove(product.id)}
                disabled={isApproving || isSavingPrice || isEditingPrice}
                className="border-success/30 bg-success text-white hover:bg-success hover:opacity-85 shadow-[0_8px_20px_-8px_var(--color-success)]"
              />
            </div>

            <div className="rounded-[28px] border border-secondary/30 bg-white/92 p-5 shadow-[0_24px_40px_-30px_rgba(240,192,63,0.95)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Pricing Settings
                  </p>
                </div>

              {!isEditingPrice ? (
                <ReviewActionButton
                  icon={<PencilLine className="h-4 w-4" />}
                  label="Edit product pricing"
                  color="var(--color-primary)"
                  onClick={handleStartEditingPrice}
                  disabled={isApproving || isSavingPrice}
                  className="border-primary/15 text-primary hover:bg-primary hover:text-white"
                />
              ) : null}
            </div>

            {isEditingPrice ? (
              <form
                className="mt-4 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSavePrice();
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Store price"
                    size="sm"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={priceDraft}
                    onChange={(event) => setPriceDraft(event.target.value)}
                  />
                  <Input
                    label="Sale price"
                    size="sm"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={salePriceDraft}
                    onChange={(event) => setSalePriceDraft(event.target.value)}
                  />
                </div>

                <p className="text-xs leading-5 text-gray-500">
                  Leave sale price empty if this product should not show a discounted value.
                </p>

                {priceError ? (
                  <p className="text-sm font-semibold text-danger">{priceError}</p>
                ) : null}

                <div className="flex items-center justify-end gap-2">
                  <ReviewActionButton
                    icon={<X className="h-4 w-4" />}
                    label="Cancel price editing"
                    color="#64748b"
                    onClick={handleCancelEditingPrice}
                    disabled={isSavingPrice}
                    className="border-slate-200 text-slate-600 hover:bg-slate-600 hover:text-white"
                  />
                  <ReviewActionButton
                    icon={
                      isSavingPrice ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )
                    }
                    label="Save product pricing"
                    variant="solid"
                    color="var(--color-success)"
                    onClick={() => void handleSavePrice()}
                    disabled={isSavingPrice}
                    className="border-success/30 bg-success text-white hover:bg-success hover:opacity-85"
                  />
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-[22px] border border-primary/10 bg-[linear-gradient(180deg,rgba(109,75,221,0.06),rgba(255,255,255,0.98))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Store price
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-gray-900">
                    {snapshot.displayPrice?.price ?? "Not set"}
                  </p>
                </div>

                <div className="rounded-[22px] border border-primary/10 bg-white px-4 py-4 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.4)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Sale price
                  </p>
                  {snapshot.displayPrice?.salePrice ? (
                    <p className="mt-2 text-xl font-bold tracking-tight text-primary">
                      {snapshot.displayPrice.salePrice}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-gray-400">No sale price</p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 rounded-[20px] border border-primary/10 bg-[linear-gradient(180deg,rgba(109,75,221,0.06),rgba(255,255,255,0.95))] px-4 py-4 text-sm text-gray-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
              {createdAt ? (
                <>
                  <p className="font-semibold text-gray-800">{createdAt.date}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">{createdAt.time}</p>
                </>
              ) : (
                <p className="font-semibold text-gray-500">Creation date unavailable</p>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

        <div className="flex w-full flex-col gap-6 p-5 md:p-8 bg-white/40 border-t border-primary/5">
        <div className="grid w-full gap-6 xl:grid-cols-2">
          <ProductGroupSection
            title="Attributes"
            groups={snapshot.attributes}
            emptyText="No attributes available on this product."
            icon={<Tag className="h-5 w-5 text-white" />}
            badgeVariant="secondary"
            iconClassName="bg-secondary"
            chipClassName="border-secondary/15 bg-secondary/10"
          />
          <ProductGroupSection
            title="Specifications"
            groups={snapshot.specifications}
            emptyText="No specifications available on this product."
            icon={<Boxes className="h-5 w-5 text-white" />}
            badgeVariant="default"
            iconClassName="bg-primary"
            chipClassName="border-primary/12 bg-primary/8"
          />
        </div>
      </div>
    </Card>
  );
}

export function ProductReviewPage() {
  const { setShowOverlay } = useLoading();
  const {
    page: storedPage,
    setPage: setStoredPage,
    limit: storedLimit,
    setLimit: setStoredLimit,
  } = useSessionStoragePage(REVIEW_STORAGE_KEY);

  const { isEnabled, isResolved } = useResolvedFeatureToggles();
  const vendorsEnabled = isEnabled("vendors_enabled");

  const [queryParams, setQueryParams] = useState<ProductFilters>(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(REVIEW_FILTERS_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return {
            ...parsed,
            page: storedPage,
            limit: storedLimit,
            status: "review",
          };
        } catch {
          // Ignore parse errors.
        }
      }
    }

    return {
      page: storedPage,
      limit: storedLimit,
      status: "review",
    };
  });

  const [searchTerm, setSearchTerm] = useState(queryParams.search || "");
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>(
    queryParams.vendor_ids?.split(",") || []
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    queryParams.category_ids?.split(",") || []
  );
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [priceOverrides, setPriceOverrides] = useState<Partial<Record<number, PriceOverride>>>({});

  const { data, isLoading, isFetching, isError, error, refetch } = useProducts(queryParams);
  const approveProduct = useUpdateProductWorkflowStatus();
  const updateProduct = useUpdateProduct();
  const permanentDeleteProduct = usePermanentDeleteProduct({
    onSuccess: () => {
      setDeleteModalOpen(false);
      setProductToDelete(null);
    },
  });

  const { data: vendorsData } = useVendors();
  const categoriesData = useCategories();
  const products = data?.data.data || [];

  useEffect(() => {
    setStoredPage(queryParams.page ?? 1);
  }, [queryParams.page, setStoredPage]);

  useEffect(() => {
    if (queryParams.limit) {
      setStoredLimit(queryParams.limit);
    }
  }, [queryParams.limit, setStoredLimit]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const { page, limit, status, ...filtersToStore } = queryParams;
      sessionStorage.setItem(REVIEW_FILTERS_STORAGE_KEY, JSON.stringify(filtersToStore));
    }
  }, [queryParams]);

  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  useEffect(() => {
    if (!isResolved || vendorsEnabled) {
      return;
    }

    setSelectedVendorIds((current) => (current.length > 0 ? [] : current));
    setQueryParams((prev) => {
      if (!prev.vendor_ids) {
        return prev;
      }

      const next = { ...prev };
      delete next.vendor_ids;
      delete next.vendor_id;
      delete next.vendorId;
      delete next.has_no_vendor;
      return { ...next, page: 1, status: "review" };
    });
  }, [isResolved, vendorsEnabled]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchTerm !== (queryParams.search || "")) {
        setQueryParams((prev) => ({
          ...prev,
          search: searchTerm || undefined,
          page: 1,
          status: "review",
        }));
      }
    }, 350);

    return () => clearTimeout(debounce);
  }, [queryParams.search, searchTerm]);

  const vendorOptions = useMemo(() => {
    return (vendorsData?.data ?? []).map((vendor: any) => ({
      value: String(vendor.id),
      label: vendor.name_en || vendor.name || String(vendor.id),
    }));
  }, [vendorsData?.data]);

  const queueItems = useMemo<QueueItem[]>(() => {
    return products.map((product) => {
      const nextProduct = priceOverrides[product.id]
        ? applyLocalPriceOverride(product as ProductLike, priceOverrides[product.id] as PriceOverride)
        : (product as ProductLike);

      return {
        product: nextProduct as Product,
        snapshot: buildReviewSnapshot(nextProduct),
      };
    });
  }, [priceOverrides, products]);

  const queueStats = useMemo(() => {
    return {
      totalPending: String(data?.data.pagination?.total ?? 0),
      pageCount: String(queueItems.length),
    };
  }, [data?.data.pagination?.total, queueItems.length]);

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    (vendorsEnabled && selectedVendorIds.length > 0) ||
    selectedCategoryIds.length > 0;

  const handleVendorChange = (value: string | string[]) => {
    const normalized = Array.isArray(value) ? value : [value].filter(Boolean);
    setSelectedVendorIds(normalized);
    setQueryParams((prev) => ({
      ...prev,
      vendor_ids: normalized.length > 0 ? normalized.join(",") : undefined,
      page: 1,
      status: "review",
    }));
  };

  const handleCategoryChange = (ids: string[]) => {
    setSelectedCategoryIds(ids);
    setQueryParams((prev) => ({
      ...prev,
      category_ids: ids.length > 0 ? ids.join(",") : undefined,
      page: 1,
      status: "review",
    }));
  };

  const handlePageChange = (page: number) => {
    setQueryParams((prev) => ({ ...prev, page, status: "review" }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setQueryParams((prev) => ({ ...prev, limit: pageSize, page: 1, status: "review" }));
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedVendorIds([]);
    setSelectedCategoryIds([]);
    setQueryParams({
      page: 1,
      limit: storedLimit,
      status: "review",
    });
  };

  const handleApproveProduct = async (productId: number) => {
    try {
      await approveProduct.mutateAsync({ id: productId, status: "active" });
    } catch (approveError) {
      console.error("Failed to approve product", approveError);
    }
  };

  const handleSavePrice = async (product: Product, values: PriceOverride) => {
    const payload: UpdateProductDto = {
      price: values.price,
      sale_price: values.salePrice,
      linked_product_ids: getLinkedProductIds(product as ProductLike),
    };

    try {
      await updateProduct.mutateAsync({
        id: product.id,
        data: payload,
      });

      setPriceOverrides((previous) => ({
        ...previous,
        [product.id]: values,
      }));
    } catch (priceError) {
      console.error("Failed to update product pricing", priceError);
      throw priceError;
    }
  };

  const handleDeleteRequest = (product: Product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) {
      return;
    }

    try {
      await permanentDeleteProduct.mutateAsync(productToDelete.id);
    } catch (deleteError) {
      console.error("Failed to permanently delete product", deleteError);
    }
  };

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
              <h3 className="text-xl font-bold">Error Loading Products Review</h3>
              <p className="mx-auto max-w-md">{error.message}</p>
              <Button onClick={() => refetch()}>Try Again</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-6 p-5 md:p-8">
      <PageHeader
        icon={<Shield />}
        title="Products Review"
        description="Approve products directly, open the supplier reference link, and compare attributes and specifications without a separate review screen."
        extraActions={
          <Button
            variant="outline"
            color="var(--color-primary2)"
            onClick={() => refetch()}
            className="h-12 rounded-full px-5 text-[15px] font-bold shadow-sm"
          >
            <RefreshCw
              className={`mr-2 inline h-4 w-4 ${isFetching && !isLoading ? "animate-spin" : ""}`}
            />
            Refresh queue
          </Button>
        }
      />

      <Card className="w-full overflow-hidden rounded-[32px] border border-primary/10 bg-[linear-gradient(135deg,rgba(109,75,221,0.08),rgba(255,255,255,0.96),rgba(240,192,63,0.12))] p-0 shadow-[0_30px_70px_-46px_rgba(15,23,42,0.55)]">
        <div className="relative overflow-hidden p-6 md:p-7">
          <div className="absolute -left-10 top-10 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute right-8 top-4 h-28 w-28 rounded-full bg-secondary/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-sm">
                <Sparkles className="h-4 w-4" />
                Simplified approval flow
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-gray-900 md:text-4xl">
                Check the source, compare the facts, approve the product.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600 md:text-base">
                The review page now keeps the important information on the card itself. Your team can
                open the reference link, compare attributes and specifications, and approve directly
                from the queue.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:w-full xl:max-w-xl">
              <QueueStatCard
                icon={<Package className="h-5 w-5" />}
                label="Pending Queue"
                value={queueStats.totalPending}
                hint="Total products still waiting for approval across all pages."
                tone="primary"
              />
              <QueueStatCard
                icon={<Boxes className="h-5 w-5" />}
                label="On This Page"
                value={queueStats.pageCount}
                hint="Products currently visible in the review queue page."
                tone="success"
              />
            </div>
          </div>
        </div>
      </Card>

      {(products.length > 0 || hasActiveFilters) && (
        <Card className="w-full rounded-[28px] border border-primary/10 shadow-[0_24px_50px_-38px_rgba(15,23,42,0.45)] p-4 md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div
            className={`grid w-full gap-4 ${
              vendorsEnabled
                ? "xl:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)_minmax(280px,1fr)]"
                : "xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,1fr)]"
            }`}
          >
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value.slice(0, 150))}
                label="Search Review Queue"
                variant="search"
                maxLength={150}
              />

              {vendorsEnabled && (
              <div className="relative z-20">
                <Select
                  label="Vendor"
                  value={selectedVendorIds}
                  onChange={handleVendorChange}
                  options={vendorOptions}
                  search={vendorOptions.length > 6}
                  multiple={true}
                  placeholder="All vendors"
                  disabled={vendorOptions.length === 0}
                />
              </div>
              )}

              <div className="relative z-30">
                <CategoryTreeSelect
                  categories={categoriesData.data ?? []}
                  selectedIds={selectedCategoryIds}
                  onChange={handleCategoryChange}
                  singleSelect={false}
                  label="Category"
                  disabled={(categoriesData.data ?? []).length === 0}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-500 xl:justify-end">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-full border border-danger/20 bg-danger/5 px-4 py-2 font-semibold text-danger transition-all hover:bg-danger hover:text-white"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>
        </Card>
      )}

      {!isLoading && queueItems.length === 0 ? (
        hasActiveFilters ? (
          <Card className="w-full rounded-[32px] border border-primary/10 py-20 text-center shadow-[0_24px_50px_-38px_rgba(15,23,42,0.45)] transition-all hover:bg-white/60">
            <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
              <div className="rounded-full bg-primary/8 p-4 text-primary">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-gray-900">
                No products match the current filters
              </h3>
              <p className="text-sm leading-7 text-gray-600">
                Clear the filters to bring the full review queue back.
              </p>
              <Button variant="outline" onClick={handleClearFilters} color="var(--color-primary2)">
                Reset review filters
              </Button>
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={<Package />}
            title="No products waiting for review"
            description="The review queue is clear. New submissions will appear here automatically."
          />
        )
      ) : (
        <div className="flex w-full flex-col gap-8">
          {queueItems.map((item) => (
            <div className="w-full" key={item.product.id}>
              <ProductReviewCard
                item={item}
                onApprove={handleApproveProduct}
                onSavePrice={handleSavePrice}
                onDelete={handleDeleteRequest}
                isApproving={
                  approveProduct.isPending && approveProduct.variables?.id === item.product.id
                }
                isSavingPrice={
                  updateProduct.isPending && updateProduct.variables?.id === item.product.id
                }
              />
            </div>
          ))}
        </div>
      )}

      {data?.data.pagination ? (
        <Pagination
          pagination={{
            currentPage: data.data.pagination.page,
            pageSize: data.data.pagination.limit,
            totalItems: data.data.pagination.total,
            totalPages: data.data.pagination.totalPages,
            hasNextPage: data.data.pagination.page < data.data.pagination.totalPages,
            hasPreviousPage: data.data.pagination.page > 1,
          }}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      ) : null}

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Product Permanently?"
        message={`This will permanently delete ${productToDelete?.name_en || "this product"}. This action cannot be undone.`}
        confirmText="Delete Permanently"
        isPermanent={true}
        isLoading={permanentDeleteProduct.isPending}
      />
    </div>
  );
}