import React from "react";
import { Input } from "../../ui/input";
import { Checkbox } from "../../ui/checkbox";
import { Card } from "@/components/ui";

interface StockSectionProps {
    quantity?: number;
    isOutOfStock: boolean;
    onChangeQuantity: (value: number | undefined) => void;
    onChangeIsOutOfStock: (value: boolean) => void;
    errors?: Record<string, string | boolean>;
}

export const StockSection: React.FC<StockSectionProps> = ({
    quantity,
    isOutOfStock,
    onChangeQuantity,
    onChangeIsOutOfStock,
    errors = {},
}) => {
    return (
        <Card id="stock">
            <div className="flex flex-col gap-5">
                <div>
                    <h2 className="text-xl font-semibold">Stock Management</h2>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-end">
                    <Input
                        id="quantity"
                        label={
                            <>
                                Quantity <span className="text-red-500">*</span>
                            </>
                        }
                        type="number"
                        min="0"
                        step="1"
                        value={quantity === undefined || quantity === null ? "" : quantity.toString()}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const raw = e.target.value;
                            onChangeQuantity(raw === "" ? undefined : parseInt(raw, 10));
                        }}
                        error={errors["quantity"]}
                    />

                    <div className="pb-3">
                        <Checkbox
                            checked={isOutOfStock}
                            onChange={onChangeIsOutOfStock}
                            label="Out of Stock"
                        />
                    </div>
                </div>
            </div>
        </Card>
    );
};
