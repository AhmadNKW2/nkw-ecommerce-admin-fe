import React from "react";
import { Input } from "../../ui/input";
import {
    DIMENSION_UNITS,
    WEIGHT_UNITS,
    WeightDimensions,
} from "../../../services/products/types/product-form.types";
import { Card, Select } from "@/components/ui";
import type { NullableNumber } from "../../../lib/nullable-number";

interface WeightDimensionsProps {
    weightDimensions?: WeightDimensions;
    onChange: (data: WeightDimensions) => void;
    errors?: Record<string, string | boolean>;
}

export function WeightDimensionsSection({
    weightDimensions,
    onChange,
    errors,
}: WeightDimensionsProps) {
    const weightUnitOptions = WEIGHT_UNITS.map((unit) => ({
        value: unit,
        label: unit.toUpperCase(),
    }));
    const dimensionUnitOptions = DIMENSION_UNITS.map((unit) => ({
        value: unit,
        label: unit.toUpperCase(),
    }));

    const handleFieldChange = (field: keyof WeightDimensions, value: NullableNumber | string) => {
        onChange({
            weight: weightDimensions?.weight,
            length: weightDimensions?.length,
            width: weightDimensions?.width,
            height: weightDimensions?.height,
            weightUnit: weightDimensions?.weightUnit || "kg",
            dimensionUnit: weightDimensions?.dimensionUnit || "cm",
            [field]: value
        });
    };

    return (
        <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 border-b pb-2">
                Weight & Dimensions (Optional)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Weight</label>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={weightDimensions?.weight ?? null}
                        onNumberChange={(value) => handleFieldChange("weight", value)}
                        placeholder="0.00"
                    />
                </div>
                <div className="space-y-2">
                    <Select
                        id="weightUnit"
                        label="Weight Unit"
                        value={weightDimensions?.weightUnit || "kg"}
                        onChange={(value) => handleFieldChange("weightUnit", value as string)}
                        options={weightUnitOptions}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Length</label>
                    <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={weightDimensions?.length ?? null}
                        onNumberChange={(value) => handleFieldChange("length", value)}
                        placeholder="0.0"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Width</label>
                    <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={weightDimensions?.width ?? null}
                        onNumberChange={(value) => handleFieldChange("width", value)}
                        placeholder="0.0"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Height</label>
                    <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={weightDimensions?.height ?? null}
                        onNumberChange={(value) => handleFieldChange("height", value)}
                        placeholder="0.0"
                    />
                </div>
                <div className="space-y-2">
                    <Select
                        id="dimensionUnit"
                        label="Dimension Unit"
                        value={weightDimensions?.dimensionUnit || "cm"}
                        onChange={(value) => handleFieldChange("dimensionUnit", value as string)}
                        options={dimensionUnitOptions}
                    />
                </div>
            </div>
        </Card>
    );
}
