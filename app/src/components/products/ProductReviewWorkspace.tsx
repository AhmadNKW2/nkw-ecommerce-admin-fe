"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { useSessionStoragePage } from "@/hooks/use-session-storage-page";
import {
    finishToastError,
    finishToastSuccess,
    showErrorToast,
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

function InfoTile({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.3)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <span className="text-primary">{icon}</span>
                <span>{label}</span>
            </div>
            <p className="mt-4 text-[15px] font-semibold leading-6 text-slate-900">{value}</p>
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
}) {
    const { product, snapshot } = item;
    const beforePrice = snapshot.displayPrice?.price ?? null;
    const afterPrice = snapshot.displayPrice?.salePrice ?? null;
    const hasTwoPrices = Boolean(beforePrice && afterPrice);
    const singlePriceValue = beforePrice ?? afterPrice;
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
                                <Badge variant={snapshot.referenceUrl ? "success" : "warning"}>
                                    {snapshot.referenceUrl ? "Reference linked" : "Reference missing"}
                                </Badge>
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

                    <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-2.5 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.25)]">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                Vendor
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                                {vendorName}
                            </p>
                        </div>
                        <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-2.5 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.25)]">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                Brand
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                                {brandName}
                            </p>
                        </div>
                        <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-2.5 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.25)]">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                Category
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                                {categoryName}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-2">
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
    const { setShowOverlay } = useLoading();
    const {
        page: storedPage,
        setPage: setStoredPage,
        limit: storedLimit,
        setLimit: setStoredLimit,
    } = useSessionStoragePage(REVIEW_STORAGE_KEY);

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
    const isMountedRef = useRef(true);

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
                snapshot: buildReviewSnapshot(nextProduct),
            };
        });
    }, [priceOverrides, products]);

    const hasActiveFilters =
        Boolean(searchTerm.trim()) || selectedVendorIds.length > 0 || selectedCategoryIds.length > 0;

    const bulkVendorId = useMemo(() => {
        if (selectedVendorIds.length !== 1) {
            return null;
        }

        const parsedValue = Number(selectedVendorIds[0]);
        return Number.isFinite(parsedValue) ? parsedValue : null;
    }, [selectedVendorIds]);

    const bulkCategoryId = useMemo(() => {
        if (selectedCategoryIds.length !== 1) {
            return null;
        }

        const parsedValue = Number(selectedCategoryIds[0]);
        return Number.isFinite(parsedValue) ? parsedValue : null;
    }, [selectedCategoryIds]);

    const canBulkReimport = bulkVendorId !== null && bulkCategoryId !== null;
    const bulkReimportDisabledMessage =
        selectedVendorIds.length !== 1
            ? "Select exactly one vendor to enable bulk re-import."
            : selectedCategoryIds.length !== 1
                ? "Select exactly one category to enable bulk re-import."
                : "Bulk AI re-import will run for the selected vendor and category only.";

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

    const monitorImportJob = async ({
        jobId,
        loadingMessage,
        successFallback,
        failureFallback,
    }: {
        jobId: string;
        loadingMessage: string;
        successFallback: string;
        failureFallback: string;
    }) => {
        const toastId = showLoadingToast(loadingMessage);

        try {
            for (let attempt = 0; attempt < IMPORT_JOB_MAX_ATTEMPTS; attempt += 1) {
                const statusResponse = await productService.getImportJobStatus(jobId);
                const jobStatus = getImportJobStatusValue(statusResponse.data);

                if (jobStatus === "done") {
                    await refetch();
                    finishToastSuccess(
                        toastId,
                        getImportJobMessage(statusResponse.data, successFallback)
                    );
                    return;
                }

                if (jobStatus === "failed") {
                    await refetch();
                    finishToastError(
                        toastId,
                        getImportJobMessage(statusResponse.data, failureFallback)
                    );
                    return;
                }

                await sleep(IMPORT_JOB_POLL_INTERVAL_MS);
            }

            updateToast(toastId, `Import job ${jobId} is still running in the background.`, {
                type: "info",
                isLoading: false,
                autoClose: 5000,
            });
        } catch (jobError) {
            finishToastError(
                toastId,
                getActionErrorMessage(jobError, "Failed to track the re-import job.")
            );
        }
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

    const handleApproveProduct = async (productId: number) => {
        try {
            await approveProduct.mutateAsync({ id: productId, status: "active" });
        } catch (approveError) {
            console.error("Failed to approve product", approveError);
        }
    };

    const handleReimportProduct = async (productId: number) => {
        if (isBulkReimporting || activeReimportProductIds.includes(productId)) {
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

            await monitorImportJob({
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
        if (!canBulkReimport) {
            showErrorToast("Select exactly one vendor and one category to bulk re-import review products.");
            return;
        }

        if (isBulkReimporting || activeReimportProductIds.length > 0) {
            return;
        }

        setIsBulkReimporting(true);

        try {
            const payload: BulkReviewReimportAiDto = {
                vendor_id: bulkVendorId,
                category_id: bulkCategoryId,
            };
            const response = await bulkReviewReimport.mutateAsync(payload);
            const jobId = getImportJobId(response.data);

            if (!jobId) {
                showErrorToast("Bulk review re-import started, but no job id was returned.");
                return;
            }

            await monitorImportJob({
                jobId,
                loadingMessage: "Re-importing the filtered review queue with AI...",
                successFallback: "Bulk review re-import finished.",
                failureFallback: "Bulk review re-import failed.",
            });
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

                    <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <p className="text-xs font-medium text-slate-500">
                            {bulkReimportDisabledMessage}
                        </p>

                        <Button
                            variant="outline"
                            color="var(--color-primary2)"
                            onClick={() => void handleBulkReimport()}
                            disabled={!canBulkReimport || isBulkReimporting || activeReimportProductIds.length > 0}
                            className="rounded-full px-4"
                        >
                            {isBulkReimporting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            {isBulkReimporting ? "Re-importing reviews" : "Bulk re-import reviews"}
                        </Button>
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
                                isBulkReimporting={isBulkReimporting}
                                isReimporting={
                                    activeReimportProductIds.includes(item.product.id)
                                }
                                isSavingPrice={
                                    updateProduct.isPending && updateProduct.variables?.id === item.product.id
                                }
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
