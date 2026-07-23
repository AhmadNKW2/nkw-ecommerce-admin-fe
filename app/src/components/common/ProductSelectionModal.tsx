/**
 * Product Selection Modal Component
 * Reusable modal for selecting products with the same filter surface as the products list
 */

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Package } from "lucide-react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { IconButton } from "../ui/icon-button";
import { Input } from "../ui/input";
import { DatePicker } from "../ui/date-picker";
import { Select } from "../ui/select";
import { CategoryTreeSelect } from "../products/CategoryTreeSelect";
import { ProductCatalogTable } from "./ProductCatalogTable";
import {
    ProductItem,
    mapProductToProductItem,
} from "./product-table-utils";
import { useProducts } from "../../services/products/hooks/use-products";
import { ProductFilters } from "../../services/products/types/product.types";
import { useVendors } from "../../services/vendors/hooks/use-vendors";
import { useBrands } from "../../services/brands/hooks/use-brands";
import { useCategories } from "../../services/categories/hooks/use-categories";
import { useCustomers } from "../../services/customers/hooks/use-customers";
import { useAdminAccess } from "../../hooks/use-admin-access";
import { PAGINATION } from "../../lib/constants";

const EMPTY_PRODUCTS: ProductItem[] = [];
const EMPTY_PRODUCT_IDS: number[] = [];
const EMPTY_API_PRODUCTS: never[] = [];

interface ProductSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedProductIds: number[];
    selectedProducts?: ProductItem[];
    onSelectionChange: (productIds: number[], selectedProducts?: ProductItem[]) => void;
    title?: string;
    excludeProductIds?: number[];
}

function mergeProductsIntoCache(
    prevCache: Record<number, ProductItem>,
    products: ProductItem[],
): Record<number, ProductItem> {
    let changed = false;
    const nextCache = { ...prevCache };

    products.forEach((product) => {
        if (prevCache[product.id] !== product) {
            nextCache[product.id] = product;
            changed = true;
        }
    });

    return changed ? nextCache : prevCache;
}

export const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({
    isOpen,
    onClose,
    selectedProductIds,
    selectedProducts = EMPTY_PRODUCTS,
    onSelectionChange,
    title = "Manage Products",
    excludeProductIds = EMPTY_PRODUCT_IDS,
}) => {
    const { canAccess } = useAdminAccess();
    const canListStaffForCreatedBy = canAccess("admins");
    const [queryParams, setQueryParams] = useState<ProductFilters>({
        page: PAGINATION.defaultPage,
        limit: PAGINATION.defaultPageSize,
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
    const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [selectedCreatedByIds, setSelectedCreatedByIds] = useState<string[]>([]);
    const [localSelectedIds, setLocalSelectedIds] = useState<number[]>(selectedProductIds);
    const [productCache, setProductCache] = useState<Record<number, ProductItem>>({});

    const { data, isLoading } = useProducts(queryParams, { enabled: isOpen });
    // Only fetch filter options while open — otherwise create/save invalidation
    // refetches these in the background and can stall post-success navigation.
    const { data: vendorsData } = useVendors(undefined, { enabled: isOpen });
    const { data: brandsData } = useBrands(undefined, { enabled: isOpen });
    const categoriesData = useCategories({ enabled: isOpen });
    const { data: adminsData } = useCustomers(
        {
            role: ["admin", "constant_token_admin"],
            limit: 100,
        } as any,
        { enabled: isOpen && canListStaffForCreatedBy },
    );

    const products = data?.data?.data ?? EMPTY_API_PRODUCTS;
    const pagination = data?.data?.pagination;

    const filteredProducts = useMemo(() => {
        if (excludeProductIds.length === 0) {
            return products;
        }
        return products.filter((product) => !excludeProductIds.includes(product.id));
    }, [excludeProductIds, products]);

    const tableProducts = useMemo(() => {
        return filteredProducts.map((product) => mapProductToProductItem(product as any));
    }, [filteredProducts]);

    useEffect(() => {
        if (isOpen) {
            setLocalSelectedIds(selectedProductIds);
        }
    }, [isOpen, selectedProductIds]);

    useEffect(() => {
        if (selectedProducts.length === 0) {
            return;
        }

        setProductCache((prevCache) => mergeProductsIntoCache(prevCache, selectedProducts));
    }, [selectedProducts]);

    useEffect(() => {
        if (tableProducts.length === 0) {
            return;
        }

        setProductCache((prevCache) => mergeProductsIntoCache(prevCache, tableProducts));
    }, [tableProducts]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            if (searchTerm !== (queryParams.search || "")) {
                setQueryParams((prev) => ({
                    ...prev,
                    search: searchTerm || undefined,
                    page: 1,
                }));
            }
        }, 500);

        return () => clearTimeout(debounce);
    }, [queryParams.search, searchTerm]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            const numericMinPrice = minPrice ? Number(minPrice) : undefined;
            const numericMaxPrice = maxPrice ? Number(maxPrice) : undefined;

            if (
                numericMinPrice !== queryParams.minPrice ||
                numericMaxPrice !== queryParams.maxPrice
            ) {
                setQueryParams((prev) => ({
                    ...prev,
                    minPrice: numericMinPrice,
                    maxPrice: numericMaxPrice,
                    page: 1,
                }));
            }
        }, 500);

        return () => clearTimeout(debounce);
    }, [maxPrice, minPrice, queryParams.maxPrice, queryParams.minPrice]);

    const vendorOptions = (vendorsData?.data ?? []).map((vendor: any) => ({
        value: String(vendor.id),
        label: vendor.name_en || vendor.name || String(vendor.id),
    }));

    const brandOptions = (brandsData?.data ?? []).map((brand: any) => ({
        value: String(brand.id),
        label: brand.name_en || brand.name || String(brand.id),
    }));

    const adminOptions = (adminsData?.data ?? []).map((admin: any) => ({
        value: String(admin.id),
        label:
            [admin.firstName, admin.lastName].filter(Boolean).join(" ") ||
            admin.email ||
            String(admin.id),
    }));

    const handlePageChange = (page: number) => {
        setQueryParams((prev) => ({ ...prev, page }));
    };

    const handlePageSizeChange = (pageSize: number) => {
        setQueryParams((prev) => ({ ...prev, limit: pageSize, page: 1 }));
    };

    const handleDateChange = (field: "start_date" | "end_date", value: string) => {
        if (field === "start_date") {
            setStartDate(value);
        } else {
            setEndDate(value);
        }

        setQueryParams((prev) => ({
            ...prev,
            [field]: value || undefined,
            page: 1,
        }));
    };

    const handleVendorChange = (value: string | string[]) => {
        const normalized = Array.isArray(value) ? value : [value].filter(Boolean);
        setSelectedVendorIds(normalized);
        setQueryParams((prev) => ({
            ...prev,
            vendor_ids: normalized.length > 0 ? normalized.join(",") : undefined,
            page: 1,
        }));
    };

    const handleBrandChange = (value: string | string[]) => {
        const normalized = Array.isArray(value) ? value : [value].filter(Boolean);
        setSelectedBrandIds(normalized);
        setQueryParams((prev) => ({
            ...prev,
            brand_ids: normalized.length > 0 ? normalized.join(",") : undefined,
            page: 1,
        }));
    };

    const handleCategoryChange = (ids: string[]) => {
        setSelectedCategoryIds(ids);
        setQueryParams((prev) => ({
            ...prev,
            category_ids: ids.length > 0 ? ids.join(",") : undefined,
            page: 1,
        }));
    };

    const handleCreatedByChange = (value: string | string[]) => {
        const normalized = Array.isArray(value) ? value : [value].filter(Boolean);
        setSelectedCreatedByIds(normalized);
        setQueryParams((prev) => ({
            ...prev,
            created_by: normalized.length > 0 ? normalized.join(",") : undefined,
            page: 1,
        }));
    };

    const handleStockChange = (value: string | string[]) => {
        const normalized = Array.isArray(value) ? value[0] : value;
        let inStock = undefined;

        if (normalized === "true") {
            inStock = true;
        } else if (normalized === "false") {
            inStock = false;
        }

        setQueryParams((prev) => ({
            ...prev,
            in_stock: inStock,
            page: 1,
        }));
    };

    const handleVisibilityChange = (value: string | string[]) => {
        const normalized = Array.isArray(value) ? value[0] : value;
        let visible = undefined;

        if (normalized === "true") {
            visible = true;
        } else if (normalized === "false") {
            visible = false;
        }

        setQueryParams((prev) => ({
            ...prev,
            visible,
            page: 1,
        }));
    };

    const handleClearAllFilters = () => {
        setSearchTerm("");
        setMinPrice("");
        setMaxPrice("");
        setStartDate("");
        setEndDate("");
        setSelectedVendorIds([]);
        setSelectedBrandIds([]);
        setSelectedCategoryIds([]);
        setSelectedCreatedByIds([]);
        setQueryParams({
            page: PAGINATION.defaultPage,
            limit: queryParams.limit || PAGINATION.defaultPageSize,
        });
    };

    const handleToggleProduct = (productId: number) => {
        setLocalSelectedIds((prev) =>
            prev.includes(productId)
                ? prev.filter((id) => id !== productId)
                : [...prev, productId]
        );
    };

    const handleToggleAll = (currentPageIds: number[], allSelected: boolean) => {
        if (allSelected) {
            setLocalSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
            return;
        }

        setLocalSelectedIds((prev) => [...new Set([...prev, ...currentPageIds])]);
    };

    const handleSave = () => {
        const nextSelectedProducts = localSelectedIds
            .map((productId) => productCache[productId])
            .filter((product): product is ProductItem => Boolean(product));

        onSelectionChange(localSelectedIds, nextSelectedProducts);
        onClose();
    };

    const handleCancel = () => {
        setLocalSelectedIds(selectedProductIds);
        onClose();
    };

    const hasActiveFilters = Object.keys(queryParams).some((key) => {
        return key !== "page" && key !== "limit" && queryParams[key as keyof ProductFilters] !== undefined;
    });

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
        today.getDate()
    ).padStart(2, "0")}`;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleCancel}
            className="w-[96vw] max-w-[96vw] items-stretch justify-start gap-0 overflow-hidden p-0"
            contentClassName="items-stretch justify-start p-0"
        >
            <div className="flex w-full min-w-0 flex-col">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-primary/10 px-6 py-5 md:px-8">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                            <Package className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">{title}</h2>
                            <p className="text-sm text-gray-500">
                                {localSelectedIds.length} product{localSelectedIds.length !== 1 ? "s" : ""} selected
                            </p>
                        </div>
                    </div>

                    <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
                        <Button variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>Save Changes</Button>
                    </div>
                </div>

                <div className="w-full min-w-0 px-6 py-5 md:px-8">
                    <div className="w-full min-w-0 space-y-5 overflow-y-auto pr-1" style={{ maxHeight: "calc(90vh - 11rem)" }}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Filters</h3>
                            {hasActiveFilters ? (
                                <button
                                    onClick={handleClearAllFilters}
                                    className="text-sm text-danger hover:text-danger2"
                                >
                                    Clear all
                                </button>
                            ) : null}
                        </div>

                        <div className="flex flex-col gap-4">
                            <Input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value.slice(0, 150))}
                                label="Search"
                                variant="search"
                                maxLength={150}
                            />

                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                                <div className="relative z-50 flex-1">
                                    <CategoryTreeSelect
                                        categories={categoriesData.data ?? []}
                                        selectedIds={selectedCategoryIds}
                                        onChange={handleCategoryChange}
                                        singleSelect={false}
                                        label="Category"
                                        disabled={(categoriesData.data ?? []).length === 0}
                                    />
                                </div>

                                <div className="relative flex-1">
                                    <Select
                                        label="Vendor"
                                        value={selectedVendorIds}
                                        onChange={handleVendorChange}
                                        options={vendorOptions}
                                        search={vendorOptions.length > 6}
                                        multiple={true}
                                        placeholder="All Vendors"
                                        disabled={vendorOptions.length === 0}
                                    />
                                </div>

                                <div className="relative flex-1">
                                    <Select
                                        label="Brand"
                                        value={selectedBrandIds}
                                        onChange={handleBrandChange}
                                        options={brandOptions}
                                        search={brandOptions.length > 6}
                                        multiple={true}
                                        placeholder="All Brands"
                                        disabled={brandOptions.length === 0}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                                <div className="relative flex-1">
                                    <DatePicker
                                        label="Create Start Date"
                                        value={startDate}
                                        onChange={(value) => handleDateChange("start_date", value)}
                                        max={endDate || todayStr}
                                    />
                                </div>

                                <div className="relative flex-1">
                                    <DatePicker
                                        label="Create End Date"
                                        value={endDate}
                                        onChange={(value) => handleDateChange("end_date", value)}
                                        min={startDate || undefined}
                                        max={todayStr}
                                    />
                                </div>

                                {canListStaffForCreatedBy ? (
                                <div className="relative flex-1">
                                    <Select
                                        label="Created By"
                                        value={selectedCreatedByIds}
                                        onChange={handleCreatedByChange}
                                        options={adminOptions}
                                        search={adminOptions.length > 6}
                                        multiple={true}
                                        placeholder="All Admins"
                                        disabled={adminOptions.length === 0}
                                    />
                                </div>
                                ) : null}
                            </div>

                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                                <div className="relative flex-1">
                                    <Select
                                        label="Stock"
                                        value={
                                            queryParams.in_stock === true
                                                ? "true"
                                                : queryParams.in_stock === false
                                                    ? "false"
                                                    : ""
                                        }
                                        onChange={handleStockChange}
                                        options={[
                                            { value: "true", label: "In Stock" },
                                            { value: "false", label: "Out of Stock" },
                                        ]}
                                        onClear={() => handleStockChange("")}
                                        multiple={false}
                                        placeholder="All Stock Status"
                                    />
                                </div>

                                <div className="relative flex-1">
                                    <Select
                                        label="Visibility"
                                        value={
                                            queryParams.visible === true
                                                ? "true"
                                                : queryParams.visible === false
                                                    ? "false"
                                                    : ""
                                        }
                                        onChange={handleVisibilityChange}
                                        options={[
                                            { value: "true", label: "Visible" },
                                            { value: "false", label: "Hidden" },
                                        ]}
                                        onClear={() => handleVisibilityChange("")}
                                        multiple={false}
                                        placeholder="All Visibility"
                                    />
                                </div>

                                <div className="relative flex-1">
                                    <Input
                                        label="Min Price"
                                        type="number"
                                        value={minPrice}
                                        onChange={(event) => setMinPrice(event.target.value)}
                                        placeholder="0.00"
                                        min={0}
                                    />
                                </div>

                                <div className="relative flex-1">
                                    <Input
                                        label="Max Price"
                                        type="number"
                                        value={maxPrice}
                                        onChange={(event) => setMaxPrice(event.target.value)}
                                        placeholder="0.00"
                                        min={0}
                                    />
                                </div>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex w-full flex-col items-center justify-center rounded-lg bg-gray-50 py-16">
                                <Package className="mb-3 h-12 w-12 text-gray-400" />
                                <p className="font-medium text-gray-500">Loading products...</p>
                            </div>
                        ) : tableProducts.length === 0 ? (
                            <div className="flex w-full flex-col items-center justify-center rounded-lg bg-gray-50 py-16">
                                <Package className="mb-3 h-12 w-12 text-gray-400" />
                                <p className="font-medium text-gray-500">No products found</p>
                                <p className="mt-1 text-sm text-gray-400">Try adjusting your filters</p>
                            </div>
                        ) : (
                            <div className="w-full min-w-0">
                                <ProductCatalogTable
                                    products={tableProducts}
                                    pagination={
                                        pagination
                                            ? {
                                                    currentPage: pagination.page,
                                                    pageSize: pagination.limit,
                                                    totalItems: pagination.total,
                                                    totalPages: pagination.totalPages,
                                                    hasNextPage: pagination.page < pagination.totalPages,
                                                    hasPreviousPage: pagination.page > 1,
                                                }
                                            : undefined
                                    }
                                    onPageChange={handlePageChange}
                                    onPageSizeChange={handlePageSizeChange}
                                    selectable={true}
                                    selectedProductIds={localSelectedIds}
                                    onToggleProduct={handleToggleProduct}
                                    onToggleAll={handleToggleAll}
                                    tableClassName="min-w-full"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
