import React from "react";
import { Input } from "../../ui/input";
import { Pricing } from "../../../services/products/types/product-form.types";
import { Checkbox } from "../../ui/checkbox";
import { Card } from "@/components/ui";

interface PricingSectionProps {
    pricing?: Pricing;
    onChange: (pricing: Pricing) => void;
    calculateSalePercentage: (price: number, salePrice?: number) => number;
    errors?: Record<string, string | boolean>;
}

export function PricingSection({
    pricing,
    onChange,
    calculateSalePercentage,
    errors,
}: PricingSectionProps) {
    const handleFieldChange = (field: keyof Pricing, value: any) => {
        onChange({
            cost: pricing?.cost,
            originalVendorPrice: pricing?.originalVendorPrice,
            originalVendorSalePrice: pricing?.originalVendorSalePrice,
            price: pricing?.price || 0,
            isSale: pricing?.isSale || false,
            salePrice: pricing?.salePrice,
            [field]: value
        });
    };

    return (
        <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-emerald-900 border-b border-emerald-100 pb-2">
                Pricing
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-4">
                    <h3 className="text-sm font-semibold text-amber-900">Vendor Source Prices</h3>
                    <p className="mt-1 text-sm text-amber-800/80">
                        Store the supplier prices before your own pricing adjustments.
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Original Vendor Price <span className="text-red-500">*</span></label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={pricing?.originalVendorPrice ?? ""}
                                onChange={(e) => handleFieldChange("originalVendorPrice", parseFloat(e.target.value) || undefined)}
                                placeholder="0.00"
                                className={errors && errors["pricing.originalVendorPrice"] ? "border-red-500" : ""}
                            />
                            {errors && errors["pricing.originalVendorPrice"] && (
                                <p className="text-sm text-red-500">{String(errors["pricing.originalVendorPrice"])}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Original Vendor Sale Price</label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={pricing?.originalVendorSalePrice ?? ""}
                                onChange={(e) => handleFieldChange("originalVendorSalePrice", parseFloat(e.target.value) || undefined)}
                                placeholder="0.00"
                                className={errors && errors["pricing.originalVendorSalePrice"] ? "border-red-500" : ""}
                            />
                            {errors && errors["pricing.originalVendorSalePrice"] && (
                                <p className="text-sm text-red-500">{String(errors["pricing.originalVendorSalePrice"])}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
                    <h3 className="text-sm font-semibold text-emerald-900">Storefront Prices</h3>
                    <p className="mt-1 text-sm text-emerald-800/80">
                        These are the prices customers see on the storefront and in admin listings.
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Cost Price</label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={pricing?.cost ?? ""}
                                onChange={(e) => handleFieldChange("cost", parseFloat(e.target.value) || undefined)}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Selling Price <span className="text-red-500">*</span></label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={pricing?.price ?? ""}
                                onChange={(e) => handleFieldChange("price", parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className={errors && errors["pricing.price"] ? "border-red-500" : ""}
                            />
                            {errors && errors["pricing.price"] && (
                                <p className="text-sm text-red-500">{String(errors["pricing.price"])}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 space-y-4">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        checked={pricing?.isSale ?? false}
                        onChange={(e: any) => handleFieldChange("isSale", e.target ? e.target.checked : e)}
                    />
                    <label htmlFor="isSale" className="text-sm font-medium text-gray-700 cursor-pointer">
                        On Sale
                    </label>
                </div>

                {pricing?.isSale && (
                    <div className="grid grid-cols-2 gap-4 rounded-lg bg-emerald-50/50 p-4 border border-emerald-100">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Sale Price <span className="text-red-500">*</span></label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={pricing?.salePrice ?? ""}
                                onChange={(e) => handleFieldChange("salePrice", parseFloat(e.target.value) || undefined)}
                                placeholder="0.00"
                                className={errors && errors["pricing.salePrice"] ? "border-red-500" : ""}
                            />
                            {errors && errors["pricing.salePrice"] && (
                                <p className="text-sm text-red-500">{String(errors["pricing.salePrice"])}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-500">Discount</label>
                            <div className="flex items-center h-10 px-3 bg-white rounded-md border border-gray-200 text-emerald-600 font-medium">
                                -{calculateSalePercentage(pricing.price || 0, pricing.salePrice)}%
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
