"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useJobTracker } from "../../providers/job-tracker-provider";
import Image from "next/image";
import {
    AlertCircle,
    Boxes,
    Check,
    CheckCircle2,
    Clock3,
    ExternalLink,
    ImageOff,
    Loader2,
    Package,
    PencilLine,
    RefreshCw,
    Store,
    Tag,
    TriangleAlert,
    X,
} from "lucide-react";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { CategoryTreeSelect } from "@/components/products/CategoryTreeSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { useSessionStoragePage } from "@/hooks/use-session-storage-page";
import {
    finishToastError,
    finishToastSuccess,
    showErrorToast,
    showSuccessToast,
    showLoadingToast,
    updateToast,
} from "@/lib/toast";
import { useLoading } from "@/providers/loading-provider";
import { productService } from "@/services/products/api/product.service";
import { useCategories } from "@/services/categories/hooks/use-categories";
import {
    useBulkReviewReimportAi,
    usePermanentDeleteProduct,
    useProducts,
    useReimportProductAi,
    useUpdateProduct,
    useUpdateProductWorkflowStatus,
} from "@/services/products/hooks/use-products";
import {
    BulkReviewReimportAiDto,
    Product,
    ProductFilters,
    UpdateProductDto,
} from "@/services/products/types/product.types";
import { useVendors } from "@/services/vendors/hooks/use-vendors";
import { useResolvedFeatureToggles } from "@/hooks/use-resolved-feature-toggles";
import type { ProductFieldToggles } from "@/services/settings/types/settings.types";

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
const IMPORT_JOB_POLL_INTERVAL_MS = 2500;
const IMPORT_JOB_MAX_ATTEMPTS = 120;
const BULK_REIMPORT_LOADING_MESSAGE = "Re-importing review products with AI...";
const LEGACY_BULK_REIMPORT_LOADING_MESSAGE = "Re-importing the filtered review queue with AI...";

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const getActionErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    const record = asRecord(error);
    const message = getDisplayText(record?.message);
    return message ?? fallback;
};

const getImportJobId = (payload: unknown) => {
    const record = asRecord(payload);
    return getDisplayText(record?.job_id, record?.jobId, record?.id);
};

const getImportJobStatusValue = (payload: unknown) => {
    const record = asRecord(payload);
    return getDisplayText(record?.status, record?.state, record?.job_status)?.toLowerCase() ?? "";
};

const getImportJobMessage = (payload: unknown, fallback: string) => {
    const record = asRecord(payload);
    const result = asRecord(record?.result);
    const errorRecord = asRecord(record?.error);

    return (
        getDisplayText(
            result?.message,
            record?.message,
            typeof record?.error === "string" ? record.error : undefined,
            errorRecord?.message
        ) ?? fallback
    );
};

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
        price: price?.raw ?? null,
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

const getCategoryLabel = (category?: {
    id?: number | null;
    name?: string | null;
    name_en?: string | null;
    name_ar?: string | null;
} | null) => {
    const englishName = typeof category?.name_en === "string" ? category.name_en.trim() : "";
    if (englishName) {
        return englishName;
    }

    const arabicName = typeof category?.name_ar === "string" ? category.name_ar.trim() : "";
    if (arabicName) {
        return arabicName;
    }

    const genericName = typeof category?.name === "string" ? category.name.trim() : "";
    if (genericName) {
        return genericName;
    }

    const id = Number(category?.id);
    if (Number.isInteger(id) && id > 0) {
        return `Category #${id}`;
    }

    return null;
};

const getAssignedCategoryLabels = (product: ProductLike) => {
    const labelsByKey = new Map<string, string>();

    const addCategory = (category?: {
        id?: number | null;
        name?: string | null;
        name_en?: string | null;
        name_ar?: string | null;
    } | null) => {
        const label = getCategoryLabel(category);
        if (!label) {
            return;
        }

        const id = Number(category?.id);
        const key = Number.isInteger(id) && id > 0 ? `id:${id}` : label.toLocaleLowerCase();

        if (!labelsByKey.has(key)) {
            labelsByKey.set(key, label);
        }
    };

    if (Array.isArray(product.categories)) {
        product.categories.forEach((category) => addCategory(category));
    }

    if (labelsByKey.size === 0) {
        addCategory(product.category);
    }

    return Array.from(labelsByKey.values());
};

const getOriginalVendorCategoryLabels = (product: ProductLike) => {
    const labelsByKey = new Map<string, string>();

    const addOriginalCategory = (category?: { id?: number | null; name?: string | null } | null) => {
        const id = Number(category?.id);
        const hasValidId = Number.isInteger(id) && id > 0;
        const name = typeof category?.name === "string" ? category.name.trim() : "";

        if (!hasValidId && !name) {
            return;
        }

        const key = hasValidId ? `id:${id}` : `name:${name.toLocaleLowerCase()}`;
        const label = name
            ? hasValidId
                ? `${name} (#${id})`
                : name
            : `Vendor category #${id}`;

        if (!labelsByKey.has(key)) {
            labelsByKey.set(key, label);
        }
    };

    if (Array.isArray(product.original_vendor_categories)) {
        product.original_vendor_categories.forEach((category) => addOriginalCategory(category));
    }

    if (Array.isArray(product.original_vendor_categories_ids)) {
        product.original_vendor_categories_ids.forEach((id) => {
            addOriginalCategory({ id });
        });
    }

    return Array.from(labelsByKey.values());
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

const buildReviewSnapshot = (
    product: ProductLike,
    toggles?: {
        vendors_enabled?: boolean;
        attributes_enabled?: boolean;
        specifications_enabled?: boolean;
    },
): ReviewSnapshot => {
    const vendorsEnabled = toggles?.vendors_enabled ?? true;
    const attributesEnabled = toggles?.attributes_enabled ?? true;
    const specificationsEnabled = toggles?.specifications_enabled ?? true;

    return {
        imageUrl: getProductImageUrl(product),
        displayPrice: getProductDisplayPrice(product),
        visible: Boolean(product.visible ?? product.is_active),
        outOfStock: isProductOutOfStock(product),
        referenceUrl: vendorsEnabled
            ? normalizeExternalUrl(product.reference_link)
            : null,
        attributes: attributesEnabled
            ? normalizeAttributeGroups(product.attributes)
            : [],
        specifications: specificationsEnabled
            ? normalizeSpecificationGroups(product.specifications)
            : [],
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

function InfoTile({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.3)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <span className="text-primary">{icon}</span>
                <span>{label}</span>
            </div>
            <div className="mt-4 min-w-0 text-[15px] font-semibold leading-6 text-slate-900">{value}</div>
        </div>
    );
}

function LabelList({
    labels,
    emptyText,
}: {
    labels: string[];
    emptyText: string;
}) {
    if (labels.length === 0) {
        return <p className="text-sm font-medium text-slate-500">{emptyText}</p>;
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {labels.map((label) => (
                <span
                    key={label}
                    className="inline-flex max-w-full items-center rounded-full border border-primary/12 bg-primary/8 px-2.5 py-1 text-[11px] font-semibold leading-5 text-slate-700"
                >
                    <span className="break-words whitespace-normal">{label}</span>
                </span>
            ))}
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
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-3 text-xs font-semibold transition-all hover:-translate-y-0.5 ${className ?? ""}`}
        >
            <span className="inline-flex items-center gap-2">
                {icon}
                <span>{label}</span>
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
    badgeVariant?:
    | "default"
    | "default2"
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning";
    iconClassName: string;
    chipClassName: string;
}) {
    const totalValues = groups.reduce((sum, group) => sum + group.values.length, 0);

    return (
        <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_14px_35px_-30px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl shadow-sm ${iconClassName}`}
                    >
                        {icon}
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        {title}
                    </p>
                </div>

                {groups.length > 0 ? <Badge variant={badgeVariant ?? "default2"}>{totalValues}</Badge> : null}
            </div>

            {groups.length === 0 ? (
                <div className="mt-4 rounded-[18px] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-3 text-xs leading-5 text-slate-500">
                    {emptyText}
                </div>
            ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {groups.map((group) => (
                        <div
                            key={group.label}
                            className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-2.5"
                        >
                            <p className="truncate text-xs font-bold text-slate-950">{group.label}</p>

                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {group.values.map((value) => (
                                    <span
                                        key={`${group.label}-${value.label}-${value.colorCode ?? ""}`}
                                        className={`inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 ${chipClassName}`}
                                    >
                                        {value.colorCode ? (
                                            <span
                                                className="h-2.5 w-2.5 rounded-full border border-black/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]"
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
    onReimport,
    onSavePrice,
    onDelete,
    isApproving,
    isBulkReimporting,
    isReimporting,
    isSavingPrice,
    toggles,
}: {
    item: QueueItem;
    onApprove: (productId: number) => Promise<void>;
    onReimport: (productId: number) => Promise<void>;
    onSavePrice: (product: Product, values: PriceOverride) => Promise<void>;
    onDelete: (product: Product) => void;
    isApproving: boolean;
    isBulkReimporting: boolean;
    isReimporting: boolean;
    isSavingPrice: boolean;
    toggles: ProductFieldToggles;
}) {
    const { product, snapshot } = item;
    const vendorsEnabled = toggles.vendors_enabled;
    const attributesEnabled = toggles.attributes_enabled;
    const specificationsEnabled = toggles.specifications_enabled;
    const referenceLinkVisibleAdmin = toggles.reference_link_visible_admin;
    const beforePrice = snapshot.displayPrice?.price ?? null;
    const afterPrice = snapshot.displayPrice?.salePrice ?? null;
    const hasTwoPrices = Boolean(beforePrice && afterPrice);
    const singlePriceValue = beforePrice ?? afterPrice;
    const createdAt = formatProductTimestamp(product.created_at as string | Date | undefined);
    const assignedCategoryLabels = getAssignedCategoryLabels(product as ProductLike);
    const originalVendorCategoryLabels = getOriginalVendorCategoryLabels(product as ProductLike);
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
        <Card className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-38px_rgba(15,23,42,0.35)] grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-w-0">
                <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)] md:items-start mb-4">
                    <div className="flex flex-col gap-2">
                        <div className="px-1">
                            <div className="mt-1 flex items-center gap-3">
                                <p className="font-mono text-lg font-semibold tracking-[0.12em] text-slate-900">
                                    #{product.id}
                                </p>
                                <div className="h-px flex-1 bg-linear-to-r from-slate-200 to-transparent" />
                            </div>
                        </div>

                        <div className="relative aspect-square overflow-hidden rounded-[20px] border border-slate-200 bg-white">
                            {snapshot.imageUrl ? (
                                <Image
                                    src={snapshot.imageUrl}
                                    alt={product.name_en || "Product image"}
                                    fill
                                    className="object-cover transition-transform duration-500 hover:scale-105"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-300">
                                    <ImageOff className="h-10 w-10" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex text-nowrap gap-2">
                                <Badge variant={snapshot.outOfStock ? "warning" : "success"}>
                                    {snapshot.outOfStock ? "Out of stock" : "In Stock"}
                                </Badge>
                                {referenceLinkVisibleAdmin && (
                                <Badge variant={snapshot.referenceUrl ? "success" : "warning"}>
                                    {snapshot.referenceUrl ? "Reference linked" : "Reference missing"}
                                </Badge>
                                )}
                                <Badge variant={snapshot.visible ? "success" : "danger"}>
                                    {snapshot.visible ? "Visible" : "Hidden"}
                                </Badge>
                            </div>
                            <p className="text-xs font-medium text-slate-400">
                                {createdAt ? `${createdAt.date} · ${createdAt.time}` : "Capture time unavailable"}
                            </p>
                        </div>

                        <h2 className="text-[28px] font-black leading-tight tracking-tight text-slate-950 md:text-[34px]">
                            {product.name_en || "Untitled product"}
                        </h2>
                        <p dir="rtl" className="mt-2 max-w-4xl text-[15px] leading-7 text-slate-600">
                            {product.name_ar || "No Arabic name yet"}
                        </p>
                    </div>

                </div>

                <div className="flex min-w-0 flex-col gap-4">

                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                        {vendorsEnabled && (
                        <InfoTile
                            icon={<Store className="h-4 w-4" />}
                            label="Vendor"
                            value={<p className="truncate text-sm font-semibold text-slate-900">{vendorName}</p>}
                        />
                        )}
                        <InfoTile
                            icon={<Tag className="h-4 w-4" />}
                            label="Brand"
                            value={<p className="truncate text-sm font-semibold text-slate-900">{brandName}</p>}
                        />
                        <InfoTile
                            icon={<Boxes className="h-4 w-4" />}
                            label="Categories"
                            value={
                                <LabelList
                                    labels={assignedCategoryLabels}
                                    emptyText="No categories assigned"
                                />
                            }
                        />
                        <InfoTile
                            icon={<Package className="h-4 w-4" />}
                            label="Original Categories"
                            value={
                                <LabelList
                                    labels={originalVendorCategoryLabels}
                                    emptyText="No original categories captured"
                                />
                            }
                        />
                    </div>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                    {attributesEnabled && (
                    <ProductGroupSection
                        title="Attributes"
                        groups={snapshot.attributes}
                        emptyText="No attributes available on this product."
                        icon={<Tag className="h-5 w-5 text-white" />}
                        badgeVariant="secondary"
                        iconClassName="bg-secondary"
                        chipClassName="border-secondary/15 bg-secondary/10"
                    />
                    )}
                    {specificationsEnabled && (
                    <ProductGroupSection
                        title="Specifications"
                        groups={snapshot.specifications}
                        emptyText="No specifications available on this product."
                        icon={<Boxes className="h-5 w-5 text-white" />}
                        badgeVariant="default"
                        iconClassName="bg-primary"
                        chipClassName="border-primary/12 bg-primary/8"
                    />
                    )}
                </div>
            </section>

            <aside>
                <div className="flex h-full flex-col gap-4">
                    <div className="rounded-[20px] border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                Price
                            </p>

                            {!isEditingPrice ? (
                                <ReviewActionButton
                                    icon={<PencilLine className="h-4 w-4" />}
                                    label="Edit"
                                    color="var(--color-primary)"
                                    onClick={handleStartEditingPrice}
                                    disabled={isApproving || isSavingPrice || isReimporting || isBulkReimporting}
                                    variant="outline"
                                    className="border-slate-200 bg-white text-slate-700"
                                />
                            ) : null}
                        </div>

                        {isEditingPrice ? (
                            <form
                                className="flex flex-col gap-4"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    void handleSavePrice();
                                }}
                            >
                                <Input
                                    label="Before price"
                                    size="default"
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    isClearButton={false}
                                    value={priceDraft}
                                    onChange={(event) => setPriceDraft(event.target.value)}
                                />
                                <Input
                                    label="After price"
                                    size="default"
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    isClearButton={false}
                                    value={salePriceDraft}
                                    onChange={(event) => setSalePriceDraft(event.target.value)}
                                />

                                {priceError ? (
                                    <p className="text-xs font-semibold text-danger">{priceError}</p>
                                ) : null}

                                <div className="flex w-full gap-2">
                                    <ReviewActionButton
                                        icon={<X className="h-4 w-4" />}
                                        label="Cancel"
                                        color="#64748b"
                                        onClick={handleCancelEditingPrice}
                                        disabled={isSavingPrice}
                                        variant="outline"
                                        className="flex-1 border-slate-200 bg-white text-slate-700"
                                    />
                                    <ReviewActionButton
                                        icon={
                                            isSavingPrice ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Check className="h-4 w-4" />
                                            )
                                        }
                                        label={isSavingPrice ? "Saving" : "Save"}
                                        variant="solid"
                                        color="var(--color-success)"
                                        onClick={() => void handleSavePrice()}
                                        disabled={isSavingPrice}
                                        className="flex-1 border-success/30 bg-success text-white shadow-[0_12px_28px_-16px_var(--color-success)]"
                                    />
                                </div>
                            </form>
                        ) : (
                            <div className={`grid gap-4 ${hasTwoPrices ? "sm:grid-cols-2 xl:grid-cols-1" : ""}`}>
                                {hasTwoPrices ? (
                                    <>
                                        <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-2.5">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                                Before price
                                            </p>
                                            <p className="mt-1 text-xl font-black tracking-tight text-danger/75">
                                                {afterPrice}
                                            </p>
                                        </div>

                                        <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                                After price
                                            </p>
                                            <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                                                {beforePrice}
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                            Price
                                        </p>
                                        <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                                            {singlePriceValue ?? "Not set"}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-2">
                            <ReviewActionButton
                                icon={<ExternalLink className="h-4 w-4" />}
                                label="Reference"
                                onClick={() => openExternalLink(snapshot.referenceUrl)}
                                disabled={!snapshot.referenceUrl || isSavingPrice || isReimporting || isBulkReimporting}
                                variant="outline"
                                color="var(--color-primary2)"
                                className="w-full border-slate-200 bg-white text-slate-700"
                            />
                            <ReviewActionButton
                                icon={
                                    isReimporting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4" />
                                    )
                                }
                                label={isReimporting ? "Re-importing" : "Re-import"}
                                color="var(--color-primary2)"
                                onClick={() => onReimport(product.id)}
                                disabled={isReimporting || isApproving || isSavingPrice || isEditingPrice || isBulkReimporting}
                                variant="outline"
                                className="w-full border-primary2/20 bg-primary2/5 text-primary2"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <ReviewActionButton
                                icon={
                                    <PencilLine className="h-4 w-4" />
                                }
                                label="Editor"
                                href={`/products/${product.id}`}
                                color="#64748b"
                                disabled={isSavingPrice || isReimporting || isBulkReimporting}
                                variant="outline"
                                className="w-full border-slate-200 bg-white text-slate-700"
                            />
                            <ReviewActionButton
                                icon={<TriangleAlert className="h-4 w-4" />}
                                label="Delete"
                                color="var(--color-danger)"
                                onClick={() => onDelete(product)}
                                disabled={isApproving || isSavingPrice || isReimporting || isBulkReimporting}
                                variant="outline"
                                className="w-full border-rose-200 bg-rose-50 text-rose-700"
                            />
                            <ReviewActionButton
                                icon={
                                    isApproving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4" />
                                    )
                                }
                                label={isApproving ? "Approving" : "Approve"}
                                variant="solid"
                                color="var(--color-success)"
                                onClick={() => onApprove(product.id)}
                                disabled={isApproving || isSavingPrice || isEditingPrice || isReimporting || isBulkReimporting}
                                className="w-full border-success/30 bg-success text-white shadow-[0_12px_28px_-16px_var(--color-success)]"
                            />
                        </div>

                    </div>
                </div>
            </aside>
        </Card>
    );
}
function ReviewEmptyState({
    hasActiveFilters,
    onClearFilters,
    onRefresh,
}: {
    hasActiveFilters: boolean;
    onClearFilters: () => void;
    onRefresh: () => void;
}) {
    return (
        <Card className="w-full rounded-4xl border border-slate-200 bg-white p-10 text-center shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] md:p-14">
            <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
                <div className="rounded-3xl bg-slate-100 p-4 text-slate-500">
                    <Package className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-black tracking-tight text-slate-950">
                    {hasActiveFilters
                        ? "No products match these filters"
                        : "No products waiting for review"}
                </h3>
                <p className="text-sm leading-7 text-slate-600">
                    {hasActiveFilters
                        ? "Clear the filters to bring the full queue back."
                        : "New submissions will appear here automatically when they enter the review queue."}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                    {hasActiveFilters ? (
                        <Button onClick={onClearFilters} color="var(--color-primary2)">
                            Reset filters
                        </Button>
                    ) : null}
                    <Button variant="outline" onClick={onRefresh} color="var(--color-primary2)">
                        Refresh queue
                    </Button>
                </div>
            </div>
        </Card>
    );
}

export function ProductReviewWorkspace() {
    const { addJob, activeJobs } = useJobTracker();
    const { setShowOverlay } = useLoading();
    const {
        page: storedPage,
        setPage: setStoredPage,
        limit: storedLimit,
        setLimit: setStoredLimit,
    } = useSessionStoragePage(REVIEW_STORAGE_KEY);

    // Feature toggles — hide gated review UI until settings are resolved.
    const { toggles } = useResolvedFeatureToggles();
    const reviewToggles: ProductFieldToggles = toggles ?? {
        id: 0,
        vendors_enabled: false,
        attributes_enabled: false,
        specifications_enabled: false,
        weight_and_dimensions_enabled: false,
        partners_enabled: false,
        cashback_enabled: false,
        banners_enabled: false,
        import_ai_products_enabled: false,
        linked_products_enabled: false,
        reference_link_visible_admin: false,
        meta_title_visible_admin: false,
        meta_description_visible_admin: false,
    };

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
    const [activeReimportProductIds, setActiveReimportProductIds] = useState<number[]>([]);
    const [isBulkReimporting, setIsBulkReimporting] = useState(false);
    const [bulkReimportModalOpen, setBulkReimportModalOpen] = useState(false);
    const [importStatusModalOpen, setImportStatusModalOpen] = useState(false);
    const [bulkReimportVendorId, setBulkReimportVendorId] = useState("");
    const [bulkReimportCategoryIds, setBulkReimportCategoryIds] = useState<string[]>([]);
    const isMountedRef = useRef(true);

    const importJobs = useMemo(() => activeJobs.filter((job) => job.type === "import"), [activeJobs]);

    // Sync button loading state with Tracker:
    const activeBulkJob = importJobs.find(
        (job) =>
            job.loadingMessage === BULK_REIMPORT_LOADING_MESSAGE ||
            job.loadingMessage === LEGACY_BULK_REIMPORT_LOADING_MESSAGE
    );
    const computedIsBulkReimporting = isBulkReimporting || !!activeBulkJob;

    const computedActiveReimportProductIds = [
        ...activeReimportProductIds,
        ...importJobs
            .filter(job => job.loadingMessage.startsWith("Re-importing product #"))
            .map(job => parseInt(job.loadingMessage.match(/#(\d+)/)?.[1] || "0", 10))
            .filter(id => id > 0)
    ];

    const { data, isLoading, isFetching, isError, error, refetch } = useProducts(queryParams);
    const approveProduct = useUpdateProductWorkflowStatus();
    const bulkReviewReimport = useBulkReviewReimportAi();
    const reimportProduct = useReimportProductAi();
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
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
        };
    }, []);

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
                snapshot: buildReviewSnapshot(nextProduct, reviewToggles),
            };
        });
    }, [priceOverrides, products, reviewToggles]);

    const hasActiveFilters =
        Boolean(searchTerm.trim()) || selectedVendorIds.length > 0 || selectedCategoryIds.length > 0;
    const hasAnyActiveReimport = computedIsBulkReimporting || computedActiveReimportProductIds.length > 0;
    const bulkReimportScopeMessage =
        bulkReimportVendorId || bulkReimportCategoryIds.length > 0
            ? "Only review products matching the optional filters below will be re-imported. Leave either field empty to keep it unrestricted."
            : "All review products will be re-imported. Choose a vendor, a category, or both if you want to narrow the run.";
    const bulkReimportActionLabel =
        computedIsBulkReimporting
            ? "Starting re-import..."
            : bulkReimportVendorId || bulkReimportCategoryIds.length > 0
                ? "Re-import selected review products"
                : "Re-import all review products";

    const renderImportJobStatusCards = (
        jobs: typeof importJobs,
        options?: {
            showJobId?: boolean;
            emptyMessage?: string;
        }
    ) => {
        if (jobs.length === 0) {
            return options?.emptyMessage ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm font-medium text-slate-500">
                    {options.emptyMessage}
                </div>
            ) : null;
        }

        return jobs.map((job) => {
            const completedCount = job.progress || 0;
            const currentIndex = job.currentIndex || 0;
            const percentage = job.total && job.total > 0
                ? Math.round((completedCount / job.total) * 100)
                : undefined;

            return (
                <div key={job.jobId} className="flex flex-col gap-1.5 w-full rounded-[18px] border border-blue-200/70 bg-white/70 px-4 py-3">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-blue-900">
                                    {job.loadingMessage}
                                </div>
                                {options?.showJobId ? (
                                    <div className="text-xs text-blue-700/80">
                                        Job ID: {job.jobId}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {percentage !== undefined ? (
                            <span className="text-xs font-semibold text-blue-800">
                                {percentage}% finished
                                {job.total && currentIndex > 0
                                    ? ` (product ${currentIndex} of ${job.total})`
                                    : ` (${completedCount} / ${job.total})`}
                            </span>
                        ) : (
                            <span className="text-xs font-semibold text-blue-700">
                                Waiting for backend progress...
                            </span>
                        )}
                    </div>

                    {percentage !== undefined ? (
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-blue-200">
                            <div
                                className="h-full bg-blue-600 transition-all duration-300 ease-out"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    ) : null}

                    {job.currentProduct ? (
                        <div className="text-xs text-blue-700/80">
                            Processing
                            {job.total && currentIndex > 0 ? ` product ${currentIndex} of ${job.total}` : ""}
                            : <span className="font-medium text-blue-800"> {job.currentProduct}</span>
                        </div>
                    ) : percentage === undefined ? (
                        <div className="text-xs text-blue-700/80">
                            Preparing the backend queue and waiting for the first progress update.
                        </div>
                    ) : null}
                </div>
            );
        });
    };

    const setProductReimportState = (productId: number, isActive: boolean) => {
        if (!isMountedRef.current) {
            return;
        }

        setActiveReimportProductIds((current) => {
            if (isActive) {
                return current.includes(productId) ? current : [...current, productId];
            }

            return current.filter((existingId) => existingId !== productId);
        });
    };

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

    const openBulkReimportModal = () => {
        setBulkReimportVendorId(selectedVendorIds.length === 1 ? selectedVendorIds[0] : "");
        setBulkReimportCategoryIds(selectedCategoryIds.length === 1 ? [selectedCategoryIds[0]] : []);
        setBulkReimportModalOpen(true);
    };

    const closeBulkReimportModal = () => {
        if (!isBulkReimporting) {
            setBulkReimportModalOpen(false);
        }
    };

    const openImportStatusModal = () => {
        setImportStatusModalOpen(true);
    };

    const closeImportStatusModal = () => {
        setImportStatusModalOpen(false);
    };

    const handleBulkReimportVendorChange = (value: string | string[]) => {
        setBulkReimportVendorId(Array.isArray(value) ? value[0] ?? "" : value);
    };

    const handleBulkReimportCategoryChange = (ids: string[]) => {
        setBulkReimportCategoryIds(ids.slice(0, 1));
    };

    const handleApproveProduct = async (productId: number) => {
        try {
            await approveProduct.mutateAsync({ id: productId, status: "active" });
        } catch (approveError) {
            console.error("Failed to approve product", approveError);
        }
    };

    const handleReimportProduct = async (productId: number) => {
        if (computedIsBulkReimporting || computedActiveReimportProductIds.includes(productId)) {
            return;
        }

        setProductReimportState(productId, true);

        try {
            const response = await reimportProduct.mutateAsync(productId);
            const jobId = getImportJobId(response.data);

            if (!jobId) {
                showErrorToast(`Re-import started for product #${productId}, but no job id was returned.`);
                return;
            }

            showSuccessToast(`Re-import started for product #${productId}.`);

            addJob({
                type: 'import',
                jobId,
                loadingMessage: `Re-importing product #${productId} with AI...`,
                successFallback: `Product #${productId} finished re-importing.`,
                failureFallback: `Product #${productId} failed to re-import.`,
            });
        } catch (reimportError) {
            showErrorToast(
                getActionErrorMessage(reimportError, `Failed to start re-import for product #${productId}.`)
            );
        } finally {
            setProductReimportState(productId, false);
        }
    };

    const handleBulkReimport = async () => {
        if (hasAnyActiveReimport) {
            return;
        }

        setIsBulkReimporting(true);

        try {
            const payload: BulkReviewReimportAiDto = {};
            const parsedVendorId = Number(bulkReimportVendorId);
            const parsedCategoryId = Number(bulkReimportCategoryIds[0] ?? "");

            if (Number.isInteger(parsedVendorId) && parsedVendorId > 0) {
                payload.vendor_id = parsedVendorId;
            }

            if (Number.isInteger(parsedCategoryId) && parsedCategoryId > 0) {
                payload.category_id = parsedCategoryId;
            }

            const response = await bulkReviewReimport.mutateAsync(payload);
            const jobId = getImportJobId(response.data);

            if (!jobId) {
                showErrorToast("Bulk review re-import started, but no job id was returned.");
                return;
            }

            addJob({
                type: 'import',
                jobId,
                loadingMessage: BULK_REIMPORT_LOADING_MESSAGE,
                successFallback: "Bulk review re-import finished.",
                failureFallback: "Bulk review re-import failed.",
            });
            showSuccessToast(
                payload.vendor_id || payload.category_id
                    ? "Bulk review re-import started for the selected filters."
                    : "Bulk review re-import started for all review products."
            );
            setBulkReimportModalOpen(false);
        } catch (bulkError) {
            showErrorToast(
                getActionErrorMessage(bulkError, "Failed to start the bulk review re-import.")
            );
        } finally {
            if (isMountedRef.current) {
                setIsBulkReimporting(false);
            }
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
            <div className="min-h-screen w-full bg-[#f6f3ee] px-4 py-10 text-slate-950 md:px-8">
                <Card className="mx-auto w-full max-w-3xl rounded-4xl border border-slate-200 bg-white p-10 text-center shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] md:p-14">
                    <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
                        <div className="rounded-3xl bg-rose-50 p-4 text-rose-600">
                            <AlertCircle className="h-8 w-8" />
                        </div>
                        <h3 className="text-2xl font-black tracking-tight text-slate-950">
                            Error loading products review
                        </h3>
                        <p className="text-sm leading-7 text-slate-600">{error.message}</p>
                        <Button onClick={() => refetch()} color="var(--color-primary2)">
                            Try again
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full text-slate-950">
            <div className="mx-auto flex w-full max-w-none flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
                {importJobs.length > 0 && (
                    <section className="flex flex-col gap-2 overflow-hidden rounded-[20px] border border-blue-200 bg-blue-50 px-6 py-4 shadow-sm">
                        {renderImportJobStatusCards(importJobs)}
                    </section>
                )}

                <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white/95 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.35)]">
                    <div className="flex flex-col gap-4 p-6 md:p-8 xl:flex-row xl:items-center xl:justify-between">
                        <h1 className="max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                            Review products.
                        </h1>

                        <div className="flex flex-wrap gap-2">
                            {hasActiveFilters ? (
                                <Button
                                    onClick={handleClearFilters}
                                    variant="outline"
                                    color="var(--color-primary2)"
                                    className="rounded-full px-4"
                                >
                                    Clear filters
                                </Button>
                            ) : null}
                            <Button
                                variant="outline"
                                color="var(--color-primary2)"
                                onClick={() => refetch()}
                                className="rounded-full px-4"
                            >
                                <RefreshCw
                                    className={`mr-2 inline h-4 w-4 ${isFetching && !isLoading ? "animate-spin" : ""}`}
                                />
                                Refresh queue
                            </Button>
                            <Button
                                variant="outline"
                                color="var(--color-primary2)"
                                onClick={openBulkReimportModal}
                                disabled={hasAnyActiveReimport}
                                className="rounded-full px-4"
                            >
                                {computedIsBulkReimporting ? "Re-importing reviews" : "Bulk re-import reviews"}
                            </Button>
                            <Button
                                variant="outline"
                                color="var(--color-primary2)"
                                onClick={openImportStatusModal}
                                className="rounded-full px-4"
                            >
                                View import status
                            </Button>
                        </div>
                    </div>
                </section>

                <section className="rounded-[30px] border border-slate-200 bg-white/95 p-5 shadow-[0_20px_55px_-42px_rgba(15,23,42,0.3)]">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.8fr)_minmax(280px,1fr)]">
                        <Input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value.slice(0, 150))}
                            label="Search review queue"
                            variant="search"
                            maxLength={150}
                        />

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

                </section>

                {!isLoading && queueItems.length === 0 ? (
                    <ReviewEmptyState
                        hasActiveFilters={hasActiveFilters}
                        onClearFilters={handleClearFilters}
                        onRefresh={() => refetch()}
                    />
                ) : (
                    <div className="flex w-full flex-col gap-6">
                        {queueItems.map((item) => (
                            <ProductReviewCard
                                key={item.product.id}
                                item={item}
                                onApprove={handleApproveProduct}
                                onReimport={handleReimportProduct}
                                onSavePrice={handleSavePrice}
                                onDelete={handleDeleteRequest}
                                isApproving={
                                    approveProduct.isPending && approveProduct.variables?.id === item.product.id
                                }
                                isBulkReimporting={computedIsBulkReimporting}
                                isReimporting={
                                    computedActiveReimportProductIds.includes(item.product.id)
                                }
                                isSavingPrice={
                                    updateProduct.isPending && updateProduct.variables?.id === item.product.id
                                }
                                toggles={reviewToggles}
                            />
                        ))}
                    </div>
                )}

                {data?.data.pagination ? (
                    <Card className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.35)] md:p-5">
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
                    </Card>
                ) : null}

                <Modal
                    isOpen={bulkReimportModalOpen}
                    onClose={closeBulkReimportModal}
                    className="self-start w-full max-w-3xl"
                >
                    <div className="flex flex-col gap-6">
                        <div className="space-y-3 pr-8">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                                <RefreshCw className="h-5 w-5" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                                    Bulk re-import review products
                                </h2>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                            {bulkReimportScopeMessage}
                        </div>

                        <div className="grid gap-4 xl:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.1fr)]">
                            <div className="relative z-20">
                                <Select
                                    label="Vendor filter"
                                    value={bulkReimportVendorId}
                                    onChange={handleBulkReimportVendorChange}
                                    options={vendorOptions}
                                    search={vendorOptions.length > 6}
                                    multiple={false}
                                    placeholder="All vendors"
                                    disabled={computedIsBulkReimporting || vendorOptions.length === 0}
                                />
                            </div>

                            <div className="relative z-10">
                                <CategoryTreeSelect
                                    categories={categoriesData.data ?? []}
                                    selectedIds={bulkReimportCategoryIds}
                                    onChange={handleBulkReimportCategoryChange}
                                    singleSelect={true}
                                    label="Category filter"
                                    disabled={computedIsBulkReimporting || (categoriesData.data ?? []).length === 0}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button
                                variant="outline"
                                color="var(--color-primary2)"
                                onClick={closeBulkReimportModal}
                                disabled={isBulkReimporting}
                                className="rounded-full px-4"
                            >
                                Cancel
                            </Button>
                            <Button
                                color="var(--color-primary2)"
                                onClick={() => void handleBulkReimport()}
                                disabled={hasAnyActiveReimport}
                                className="rounded-full px-5"
                            >
                                {bulkReimportActionLabel}
                            </Button>
                        </div>
                    </div>
                </Modal>

                <Modal
                    isOpen={importStatusModalOpen}
                    onClose={closeImportStatusModal}
                    className="self-start w-full max-w-4xl"
                >
                    <div className="flex flex-col gap-6">
                        <div className="space-y-2 pr-8">
                            <h2 className="text-2xl font-black tracking-tight text-slate-950">
                                View import status
                            </h2>
                            <p className="text-sm leading-7 text-slate-600">
                                Tracked import jobs from this browser continue updating here after refresh or re-login while the backend job is still running.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 md:p-5">
                            {renderImportJobStatusCards(importJobs, {
                                showJobId: true,
                                emptyMessage: "No import jobs are currently being tracked in this browser.",
                            })}
                        </div>

                        <div className="flex justify-end">
                            <Button
                                variant="outline"
                                color="var(--color-primary2)"
                                onClick={closeImportStatusModal}
                                className="rounded-full px-5"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>

                <DeleteConfirmationModal
                    isOpen={deleteModalOpen}
                    onClose={() => {
                        setDeleteModalOpen(false);
                        setProductToDelete(null);
                    }}
                    onConfirm={handleDeleteConfirm}
                    title="Delete Product Permanently?"
                    message="This action cannot be undone. The product will be removed from the system permanently."
                    confirmText="Delete Permanently"
                    cancelText="Cancel"
                    isPermanent={true}
                    isLoading={permanentDeleteProduct.isPending}
                />
            </div>
        </div>
    );
}
