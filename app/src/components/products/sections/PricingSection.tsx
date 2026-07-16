import React from "react";
import { Tag } from "lucide-react";
import { Input } from "../../ui/input";
import { FieldWrapper, getFieldClassesBySize } from "../../ui/field-wrapper";
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
    /** Vendor portal: Cost + Price only (no sale price). */
    costAndPriceOnly?: boolean;
}

export function PricingSection({
    pricing,
    onChange,
    calculateSalePercentage,
    errors,
    vendorSourcePricesVisible = true,
    costAndPriceOnly = false,
}: PricingSectionProps) {
    const handleFieldChange = (field: keyof Pricing, value: NullableNumber | boolean) => {
        onChange({
            cost: pricing?.cost,
            originalVendorPrice: pricing?.originalVendorPrice,
            originalVendorSalePrice: pricing?.originalVendorSalePrice,
            price: pricing?.price,
            isSale: costAndPriceOnly ? false : pricing?.isSale || false,
            salePrice: costAndPriceOnly ? undefined : pricing?.salePrice,
            [field]: value,
        });
    };

    const isOnSale = costAndPriceOnly ? false : (pricing?.isSale ?? false);
    const discountPercent =
        isOnSale && pricing?.salePrice != null
            ? calculateSalePercentage(pricing.price || 0, pricing.salePrice)
            : 0;

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">
                    Pricing
                </h2>
                {!costAndPriceOnly ? (
                <Checkbox
                    checked={isOnSale}
                    onChange={(checked) => handleFieldChange("isSale", checked)}
                    label="On Sale"
                />
                ) : null}
            </div>
            <div className="flex flex-col gap-4">
                {vendorSourcePricesVisible && (
                    <div className="grid gap-4 md:grid-cols-2">
                        <Input
                            id="pricing.originalVendorPrice"
                            label={
                                <>
                                    Original Vendor Price <span className="text-red-500">*</span>
                                </>
                            }
                            type="number"
                            min="0"
                            step="0.01"
                            value={pricing?.originalVendorPrice ?? null}
                            onNumberChange={(value) =>
                                handleFieldChange("originalVendorPrice", value)
                            }
                            error={errors?.["pricing.originalVendorPrice"]}
                        />

                        <Input
                            id="pricing.originalVendorSalePrice"
                            label="Original Vendor Sale Price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={pricing?.originalVendorSalePrice ?? null}
                            onNumberChange={(value) =>
                                handleFieldChange("originalVendorSalePrice", value)
                            }
                            error={errors?.["pricing.originalVendorSalePrice"]}
                        />
                    </div>
                )}

                <div
                    className={`grid gap-4 items-end ${
                        isOnSale
                            ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                            : "md:grid-cols-2"
                    }`}
                >
                    <Input
                        id="pricing.cost"
                        label="Cost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={pricing?.cost ?? null}
                        onNumberChange={(value) => handleFieldChange("cost", value)}
                    />

                    <Input
                        id="pricing.price"
                        label={
                            <>
                                Price <span className="text-red-500">*</span>
                            </>
                        }
                        type="number"
                        min="0"
                        step="0.01"
                        value={pricing?.price ?? null}
                        onNumberChange={(value) => handleFieldChange("price", value)}
                        error={errors?.["pricing.price"]}
                    />

                    {isOnSale && (
                        <>
                            <Input
                                id="pricing.salePrice"
                                label={
                                    <>
                                        Sale Price <span className="text-red-500">*</span>
                                    </>
                                }
                                type="number"
                                min="0"
                                step="0.01"
                                value={pricing?.salePrice ?? null}
                                onNumberChange={(value) => handleFieldChange("salePrice", value)}
                                error={errors?.["pricing.salePrice"]}
                            />

                            <div className="w-28 shrink-0">
                                <FieldWrapper
                                    label="Discount"
                                    isFocused={false}
                                    hasValue
                                    isClearButton={false}
                                >
                                    <div
                                        className={`${getFieldClassesBySize("default", false, true, false, false)} flex items-center gap-2 ${discountPercent > 0 ? "font-semibold text-rose-700" : "text-gray-400"}`}
                                    >
                                        <Tag
                                            className={`h-4 w-4 shrink-0 ${discountPercent > 0 ? "text-rose-500" : "text-primary/60"}`}
                                        />
                                        <span className="tabular-nums">
                                            {discountPercent > 0 ? `-${discountPercent}%` : "—"}
                                        </span>
                                    </div>
                                </FieldWrapper>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Card>
    );
};
