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
            <h2 className="text-xl font-semibold">
                Weight & Dimensions (Optional)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    id="weight"
                    label="Weight"
                    type="number"
                    min="0"
                    step="0.01"
                    value={weightDimensions?.weight ?? null}
                    onNumberChange={(value) => handleFieldChange("weight", value)}
                />
                <Select
                    id="weightUnit"
                    label="Weight Unit"
                    value={weightDimensions?.weightUnit || "kg"}
                    onChange={(value) => handleFieldChange("weightUnit", value as string)}
                    options={weightUnitOptions}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                    id="length"
                    label="Length"
                    type="number"
                    min="0"
                    step="0.1"
                    value={weightDimensions?.length ?? null}
                    onNumberChange={(value) => handleFieldChange("length", value)}
                />
                <Input
                    id="width"
                    label="Width"
                    type="number"
                    min="0"
                    step="0.1"
                    value={weightDimensions?.width ?? null}
                    onNumberChange={(value) => handleFieldChange("width", value)}
                />
                <Input
                    id="height"
                    label="Height"
                    type="number"
                    min="0"
                    step="0.1"
                    value={weightDimensions?.height ?? null}
                    onNumberChange={(value) => handleFieldChange("height", value)}
                />
                <Select
                    id="dimensionUnit"
                    label="Dimension Unit"
                    value={weightDimensions?.dimensionUnit || "cm"}
                    onChange={(value) => handleFieldChange("dimensionUnit", value as string)}
                    options={dimensionUnitOptions}
                />
            </div>
        </Card>
    );
}
