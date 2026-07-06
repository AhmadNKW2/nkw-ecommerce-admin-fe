import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Input } from "../../ui/input";
import { normalizeExternalUrl, openReferenceLink } from "../../../lib/reference-link";
import { RichTextEditor } from "../../ui/rich-text-editor";
import { Select } from "../../ui/select";
import { Card } from "@/components/ui";
import { Toggle } from "@/components/ui/toggle";
import { Category } from "../../../services/categories/types/category.types";
import { CategoryTreeSelect } from "../CategoryTreeSelect";
import type { LinkedProductSummary, ProductStatus } from "../../../services/products/types/product.types";
import { LinkedProductsField } from "./LinkedProductsField";

const RECENT_VENDOR_KEY = 'recent_vendor_ids';
const RECENT_BRAND_KEY = 'recent_brand_ids';
const RECENT_CATEGORY_KEY = 'recent_category_ids';

const getRecentIds = (key: string): string[] => {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const addRecentId = (key: string, id: string | string[]) => {
    if (typeof window === 'undefined') return;
    try {
        const recent = getRecentIds(key);
        const ids = Array.isArray(id) ? id : [id];
        if (ids.length === 0) return;
        const updated = [...new Set([...ids, ...recent])].slice(0, 5);
        localStorage.setItem(key, JSON.stringify(updated));
    } catch {
        // ignore
    }
};

interface BasicInformationSectionProps {
    formData: {
        nameEn?: string;
        nameAr?: string;
        sku?: string;
        record?: string;
        status?: ProductStatus;
        categoryIds?: string[]; // Changed from categoryId to categoryIds
        vendorId?: string;
        brandId?: string;
        referenceLink?: string;
        linked_product_ids?: string[];
        shortDescriptionEn?: string;
        shortDescriptionAr?: string;
        longDescriptionEn?: string;
        longDescriptionAr?: string;
        visible?: boolean;
        metaTitleEn?: string;
        metaTitleAr?: string;
        metaDescriptionEn?: string;
        metaDescriptionAr?: string;
        tags?: string[];
    };
    errors: Record<string, string | boolean>;
    categories: Category[];
    vendors: Array<{ id: string; name: string; nameEn?: string; nameAr?: string }>;
    brands: Array<{ id: string; name: string; nameEn?: string; nameAr?: string }>;
    onChange: (field: string, value: any) => void;
    currentProductId?: string;
    initialLinkedProducts?: LinkedProductSummary[];
    vendorsEnabled?: boolean;
    referenceLinkVisible?: boolean;
    referenceLinkActionsEnabled?: boolean;
    metaTitleVisible?: boolean;
    metaDescriptionVisible?: boolean;
    statusVisible?: boolean;
    linkedProductsEnabled?: boolean;
}

export const BasicInformationSection: React.FC<BasicInformationSectionProps> = ({
    formData,
    errors,
    categories,
    vendors,
    brands,
    onChange,
    currentProductId,
    initialLinkedProducts,
    vendorsEnabled = true,
    referenceLinkVisible = true,
    referenceLinkActionsEnabled = true,
    metaTitleVisible = true,
    metaDescriptionVisible = true,
    statusVisible = true,
    linkedProductsEnabled = true,
}) => {
    // Save to localStorage when selected
    useEffect(() => {
        if (formData.vendorId) addRecentId(RECENT_VENDOR_KEY, formData.vendorId);
    }, [formData.vendorId]);
    
    useEffect(() => {
        if (formData.brandId) addRecentId(RECENT_BRAND_KEY, formData.brandId);
    }, [formData.brandId]);
    
    useEffect(() => {
        if (formData.categoryIds && formData.categoryIds.length > 0) {
            addRecentId(RECENT_CATEGORY_KEY, formData.categoryIds);
        }
    }, [formData.categoryIds]);

    // Sorting logic to bring recent and selected items to top
    const sortedVendors = useMemo(() => {
        const recentIds = getRecentIds(RECENT_VENDOR_KEY);
        // Prioritize currently selected, then recent, then rest
        const priorityIds = new Set([formData.vendorId, ...recentIds].filter(Boolean));
        
        const priority = vendors.filter(v => priorityIds.has(v.id));
        const rest = vendors.filter(v => !priorityIds.has(v.id));
        
        // Sort priority items so currently selected is first, then rest of recent by index
        priority.sort((a, b) => {
            if (a.id === formData.vendorId) return -1;
            if (b.id === formData.vendorId) return 1;
            return recentIds.indexOf(a.id) - recentIds.indexOf(b.id);
        });

        return [...priority, ...rest];
    }, [vendors, formData.vendorId]);

    const sortedBrands = useMemo(() => {
        const recentIds = getRecentIds(RECENT_BRAND_KEY);
        const priorityIds = new Set([formData.brandId, ...recentIds].filter(Boolean));
        
        const priority = brands.filter(b => priorityIds.has(b.id));
        const rest = brands.filter(b => !priorityIds.has(b.id));
        
        priority.sort((a, b) => {
            if (a.id === formData.brandId) return -1;
            if (b.id === formData.brandId) return 1;
            return recentIds.indexOf(a.id) - recentIds.indexOf(b.id);
        });

        return [...priority, ...rest];
    }, [brands, formData.brandId]);

    const recentCategoriesList = useMemo(() => {
        const recentIds = getRecentIds(RECENT_CATEGORY_KEY);
        if (!recentIds.length) return [];
        
        const foundCategories: Category[] = [];
        const findInTree = (cats: Category[], id: string) => {
            for (const cat of cats) {
                if (cat.id.toString() === id) {
                    foundCategories.push(cat);
                    return true;
                }
                if (cat.children && findInTree(cat.children, id)) return true;
            }
            return false;
        };
        
        recentIds.forEach(id => findInTree(categories, id));
        return foundCategories;
    }, [categories]);

    const sortedCategories = useMemo(() => {
        const recentIds = getRecentIds(RECENT_CATEGORY_KEY);
        // Include both current selection and recent choices
        const priorityIds = new Set([...(formData.categoryIds || []), ...recentIds].filter(Boolean));

        if (priorityIds.size === 0) return categories;

        const isPriorityNode = (cat: Category): boolean => {
            if (priorityIds.has(cat.id.toString())) return true;
            if (cat.children) return cat.children.some(isPriorityNode);
            return false;
        };

        const sortTree = (cats: Category[]): Category[] => {
            const priority = cats.filter(isPriorityNode);
            const rest = cats.filter(c => !isPriorityNode(c));
            
            // Sort priority nodes to match the order of recentIds, with current selection first
            priority.sort((a, b) => {
                const aId = a.id.toString();
                const bId = b.id.toString();
                
                // If one is currently selected and the other isn't, prioritize selected
                const aSelected = formData.categoryIds?.includes(aId);
                const bSelected = formData.categoryIds?.includes(bId);
                if (aSelected && !bSelected) return -1;
                if (!aSelected && bSelected) return 1;
                
                // If neither or both are selected, sort by recent usage
                const aIndex = recentIds.indexOf(aId);
                const bIndex = recentIds.indexOf(bId);
                
                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                if (aIndex !== -1) return -1;
                if (bIndex !== -1) return 1;
                
                return 0; // Maintain original order if neither is recent (e.g. they only have priority children)
            });
            
            return [
                ...priority.map(c => ({
                    ...c, 
                    children: c.children ? sortTree(c.children) : undefined
                })), 
                ...rest.map(c => ({
                    ...c, 
                    children: c.children ? sortTree(c.children) : undefined
                }))
            ];
        };

        return sortTree(categories);
    }, [categories, formData.categoryIds]);

    const handleVendorChange = (value: string) => {
        if (formData.vendorId && formData.vendorId !== value && (formData.linked_product_ids?.length || 0) > 0) {
            onChange("linked_product_ids", []);
        }

        onChange("vendorId", value);
    };

    return (
        <Card>
            <h2 className="text-xl font-semibold ">
                Basic Information
            </h2>

            {/* Product Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                    id="nameEn"
                    label="Product Name (English)"
                    value={formData.nameEn || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onChange("nameEn", e.target.value)
                    }
                    error={errors.nameEn}
                />

                <Input
                    id="nameAr"
                    label="Product Name (Arabic)"
                    value={formData.nameAr || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onChange("nameAr", e.target.value)
                    }
                    isRtl
                    error={errors.nameAr}
                />

                {/* Short Descriptions */}
                <RichTextEditor
                    id="shortDescriptionEn"
                    label="Short Description (English)"
                    value={formData.shortDescriptionEn || ""}
                    onChange={(value) =>
                        onChange("shortDescriptionEn", value)
                    }
                    error={errors.shortDescriptionEn}
                />

                <RichTextEditor
                    id="shortDescriptionAr"
                    label="Short Description (Arabic)"
                    value={formData.shortDescriptionAr || ""}
                    onChange={(value) =>
                        onChange("shortDescriptionAr", value)
                    }
                    isRtl
                    error={errors.shortDescriptionAr}
                />

                {/* Long Descriptions */}
                <RichTextEditor
                    id="longDescriptionEn"
                    label="Long Description (English)"
                    value={formData.longDescriptionEn || ""}
                    onChange={(value) =>
                        onChange("longDescriptionEn", value)
                    }
                    error={errors.longDescriptionEn}
                />

                <RichTextEditor
                    id="longDescriptionAr"
                    label="Long Description (Arabic)"
                    value={formData.longDescriptionAr || ""}
                    onChange={(value) =>
                        onChange("longDescriptionAr", value)
                    }
                    isRtl
                    error={errors.longDescriptionAr}
                />

                {/* Category, Vendor */}
                <CategoryTreeSelect
                    id="categoryIds"
                    label="Categories"
                    categories={sortedCategories}
                    recentCategories={recentCategoriesList}
                    selectedIds={formData.categoryIds || []}
                    onChange={(ids) => onChange("categoryIds", ids)}
                    error={errors.categoryIds}
                />

                {vendorsEnabled && (
                <Select
                    id="vendorId"
                    label="Vendor"
                    value={formData.vendorId || ""}
                    onChange={(value) => handleVendorChange(value as string)}
                    options={[
                        ...sortedVendors.map((vendor) => ({
                            value: vendor.id,
                            label: vendor.nameEn && vendor.nameAr
                                ? `${vendor.nameEn} - ${vendor.nameAr}`
                                : vendor.name,
                        })),
                    ]}
                    search={true}
                    error={errors.vendorId}
                />
                )}

                <Select
                    id="brandId"
                    label="Brand"
                    value={formData.brandId || ""}
                    onChange={(value) => onChange("brandId", value as string)}
                    options={[
                        ...sortedBrands.map((brand) => ({
                            value: brand.id,
                            label: brand.nameEn && brand.nameAr
                                ? `${brand.nameEn} - ${brand.nameAr}`
                                : brand.name,
                        })),
                    ]}
                    search={true}
                    error={errors.brandId}
                />

                {statusVisible && (
                <Select
                    id="status"
                    label="Status"
                    value={formData.status || "active"}
                    onChange={(value) => onChange("status", value as ProductStatus)}
                    options={[
                        { value: "active", label: "Active" },
                        { value: "archived", label: "Archived" },
                        { value: "updated", label: "Updated" },
                        { value: "review", label: "Review" },
                    ]}
                    error={errors.status}
                />
                )}

                {referenceLinkVisible && (
                <Input
                    id="referenceLink"
                    label="Reference Link"
                    value={formData.referenceLink || ""}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                    error={errors.referenceLink}
                    rightElement={referenceLinkActionsEnabled ? (
                        <button
                            type="button"
                            onClick={() => openReferenceLink(formData.referenceLink)}
                            disabled={!normalizeExternalUrl(formData.referenceLink)}
                            className="rounded-full p-1.5 text-primary2 transition-colors hover:bg-primary2/10 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Preview reference link"
                            title={
                                normalizeExternalUrl(formData.referenceLink)
                                    ? "Open reference link"
                                    : "No reference link"
                            }
                        >
                            <ExternalLink className="h-4 w-4" />
                        </button>
                    ) : undefined}
                />
                )}

                {referenceLinkActionsEnabled && !referenceLinkVisible && (
                <div className="col-span-2">
                    <button
                        type="button"
                        onClick={() => openReferenceLink(formData.referenceLink)}
                        disabled={!normalizeExternalUrl(formData.referenceLink)}
                        className="inline-flex items-center gap-2 rounded-lg border border-primary2/20 bg-primary2/5 px-3 py-2 text-sm font-medium text-primary2 transition-colors hover:bg-primary2/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Open Reference Link
                    </button>
                </div>
                )}

                {metaTitleVisible && (
                <>
                <Input
                    id="metaTitleEn"
                    label="Meta Title (English)"
                    value={formData.metaTitleEn || ""}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                    error={errors.metaTitleEn}
                />

                <Input
                    id="metaTitleAr"
                    label="Meta Title (Arabic)"
                    value={formData.metaTitleAr || ""}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                    isRtl
                    error={errors.metaTitleAr}
                />
                </>
                )}

                {metaDescriptionVisible && (
                <>
                <Input
                    id="metaDescriptionEn"
                    label="Meta Description (English)"
                    value={formData.metaDescriptionEn || ""}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                    error={errors.metaDescriptionEn}
                />

                <Input
                    id="metaDescriptionAr"
                    label="Meta Description (Arabic)"
                    value={formData.metaDescriptionAr || ""}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                    isRtl
                    error={errors.metaDescriptionAr}
                />
                </>
                )}

                {linkedProductsEnabled && (
                <div className="col-span-2">
                    <LinkedProductsField
                        value={formData.linked_product_ids || []}
                        onChange={(value) => onChange("linked_product_ids", value)}
                        error={errors.linked_product_ids}
                        categoryIds={formData.categoryIds}
                        vendorId={formData.vendorId}
                        excludeProductId={currentProductId}
                        initialSelectedProducts={initialLinkedProducts}
                    />
                </div>
                )}

                {/* Visibility Status */}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <p className="font-medium">Visibility Status</p>
                    <Toggle checked={formData.visible ?? true} onChange={(checked) => onChange("visible", checked)} />
                </div>
            </div>
        </Card>
    );
};
