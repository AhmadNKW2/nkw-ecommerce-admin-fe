import React from "react";
import { Tag } from "lucide-react";
import { Input } from "../../ui/input";
import { Pricing } from "../../../services/products/types/product-form.types";
import { Checkbox } from "../../ui/checkbox";
import { Card } from "@/components/ui";
import type { NullableNumber } from "../../../lib/nullable-number";

interface PricingSectionProps {
    pricing?: Pricing;
    onChange: (pricing: Pricing) => void;
    calculateSalePercentage: (price: number, salePrice?: number) => number;
    errors?: Record<string, string | boolean>;
    vendorSourcePricesVisible?: boolean;
}

export function PricingSection({
    pricing,
    onChange,
    calculateSalePercentage,
    errors,
    vendorSourcePricesVisible = true,
}: PricingSectionProps) {
    const handleFieldChange = (field: keyof Pricing, value: NullableNumber | boolean) => {
        onChange({
            cost: pricing?.cost,
            originalVendorPrice: pricing?.originalVendorPrice,
            originalVendorSalePrice: pricing?.originalVendorSalePrice,
            price: pricing?.price,
            isSale: pricing?.isSale || false,
            salePrice: pricing?.salePrice,
            [field]: value,
        });
    };

    const isOnSale = pricing?.isSale ?? false;
    const discountPercent =
        isOnSale && pricing?.salePrice != null
            ? calculateSalePercentage(pricing.price || 0, pricing.salePrice)
            : 0;

    return (
        <Card className="p-6">
            <h2 className="text-xl font-semibold">
                Pricing
            </h2>
            <div className={`grid gap-4 ${vendorSourcePricesVisible ? "lg:grid-cols-2" : ""}`}>
                {vendorSourcePricesVisible && (
                    <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-4">
                        <h3 className="text-sm font-semibold text-amber-900">Vendor Source Prices</h3>
                        <p className="mt-1 text-sm text-amber-800/80">
                            Store the supplier prices before your own pricing adjustments.
                        </p>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Original Vendor Price <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={pricing?.originalVendorPrice ?? null}
                                    onNumberChange={(value) =>
                                        handleFieldChange("originalVendorPrice", value)
                                    }
                                    placeholder="0.00"
                                    className={
                                        errors && errors["pricing.originalVendorPrice"]
                                            ? "border-red-500"
                                            : ""
                                    }
                                />
                                {errors && typeof errors["pricing.originalVendorPrice"] === "string" && (
                                    <p className="text-sm text-red-500">
                                        {errors["pricing.originalVendorPrice"]}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Original Vendor Sale Price
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={pricing?.originalVendorSalePrice ?? null}
                                    onNumberChange={(value) =>
                                        handleFieldChange("originalVendorSalePrice", value)
                                    }
                                    placeholder="0.00"
                                    className={
                                        errors && errors["pricing.originalVendorSalePrice"]
                                            ? "border-red-500"
                                            : ""
                                    }
                                />
                                {errors && typeof errors["pricing.originalVendorSalePrice"] === "string" && (
                                    <p className="text-sm text-red-500">
                                        {errors["pricing.originalVendorSalePrice"]}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}


                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={isOnSale}
                            onChange={(e: any) =>
                                handleFieldChange("isSale", e.target ? e.target.checked : e)
                            }
                        />
                        <label className="text-sm font-medium text-gray-700 cursor-pointer">
                            On Sale
                        </label>
                    </div>

                    <div
                        className={`grid gap-4 ${isOnSale
                                ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                                : "md:grid-cols-2"
                            }`}
                    >
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Cost Price</label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                size="sm"
                                className="w-full"
                                value={pricing?.cost ?? null}
                                onNumberChange={(value) => handleFieldChange("cost", value)}
                                placeholder="0.00"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                                Price <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="pricing.price"
                                type="number"
                                min="0"
                                step="0.01"
                                size="sm"
                                className="w-full"
                                value={pricing?.price ?? null}
                                onNumberChange={(value) => handleFieldChange("price", value)}
                                placeholder="0.00"
                                error={errors?.["pricing.price"]}
                            />
                            {errors && typeof errors["pricing.price"] === "string" && (
                                <p className="text-sm text-red-500">
                                    {errors["pricing.price"]}
                                </p>
                            )}
                        </div>

                        {isOnSale && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Sale Price <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        size="sm"
                                        className="w-full"
                                        value={pricing?.salePrice ?? null}
                                        onNumberChange={(value) => handleFieldChange("salePrice", value)}
                                        placeholder="0.00"
                                        error={errors?.["pricing.salePrice"]}
                                    />
                                    {errors && typeof errors["pricing.salePrice"] === "string" && (
                                        <p className="text-sm text-red-500">
                                            {errors["pricing.salePrice"]}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col justify-end space-y-2">
                                    <span className="text-sm font-medium text-gray-500">Discount</span>
                                    <div
                                        className={`flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2 ${discountPercent > 0
                                                ? "border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 text-rose-700 shadow-sm"
                                                : "border-gray-200 bg-white text-gray-400"
                                            }`}
                                    >
                                        <Tag
                                            className={`h-4 w-4 shrink-0 ${discountPercent > 0 ? "text-rose-500" : ""
                                                }`}
                                        />
                                        <span className="text-lg font-bold tabular-nums">
                                            {discountPercent > 0 ? `-${discountPercent}%` : "—"}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
};
