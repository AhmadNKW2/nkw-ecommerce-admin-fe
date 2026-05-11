"use client";

import { useMemo, useState } from "react";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import type { CashbackRule, CreateCashbackRuleDto } from "../../services/cashback-rules/types/cashback-rule.types";

interface CashbackRuleFormProps {
  initial?: Partial<CashbackRule>;
  onSubmit: (data: CreateCashbackRuleDto) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  submitLabel?: string;
}

export function CashbackRuleForm({
  initial,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel = "Save",
}: CashbackRuleFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(String(initial?.type ?? "percentage"));
  const [value, setValue] = useState(initial?.value != null ? String(initial.value) : "");
  const [minOrderAmount, setMinOrderAmount] = useState(
    initial?.minOrderAmount != null ? String(initial.minOrderAmount) : ""
  );
  const [maxCashbackAmount, setMaxCashbackAmount] = useState(
    initial?.maxCashbackAmount != null ? String(initial.maxCashbackAmount) : ""
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [formError, setFormError] = useState<string | null>(null);

  const typeOptions = useMemo(
    () => [
      { value: "percentage", label: "Percentage" },
      { value: "fixed", label: "Fixed Amount" },
    ],
    []
  );

  const parsedValue = value.trim() ? Number(value) : NaN;
  const parsedMinOrderAmount = minOrderAmount.trim() ? Number(minOrderAmount) : undefined;
  const parsedMaxCashbackAmount = maxCashbackAmount.trim() ? Number(maxCashbackAmount) : undefined;

  const errors = useMemo(() => {
    const next: Record<string, string> = {};

    if (!name.trim()) {
      next.name = "Rule name is required.";
    }

    if (!value.trim()) {
      next.value = "Reward value is required.";
    } else if (Number.isNaN(parsedValue) || parsedValue <= 0) {
      next.value = "Reward value must be greater than 0.";
    } else if (type === "percentage" && parsedValue > 100) {
      next.value = "Percentage cashback cannot be more than 100%.";
    }

    if (minOrderAmount.trim()) {
      if (parsedMinOrderAmount === undefined || Number.isNaN(parsedMinOrderAmount) || parsedMinOrderAmount < 0) {
        next.minOrderAmount = "Minimum order amount must be 0 or more.";
      }
    }

    if (maxCashbackAmount.trim()) {
      if (parsedMaxCashbackAmount === undefined || Number.isNaN(parsedMaxCashbackAmount) || parsedMaxCashbackAmount < 0) {
        next.maxCashbackAmount = "Maximum cashback must be 0 or more.";
      } else if (type === "fixed" && !Number.isNaN(parsedValue) && parsedMaxCashbackAmount < parsedValue) {
        next.maxCashbackAmount = "For fixed cashback, the cap cannot be lower than the reward value.";
      }
    }

    return next;
  }, [
    maxCashbackAmount,
    minOrderAmount,
    name,
    parsedMaxCashbackAmount,
    parsedMinOrderAmount,
    parsedValue,
    type,
    value,
  ]);

  const canSubmit = Object.keys(errors).length === 0 && name.trim().length > 0 && value.trim().length > 0;

  const previewOrderAmount = parsedMinOrderAmount && parsedMinOrderAmount > 0 ? parsedMinOrderAmount : 100;
  const previewRawCashback = type === "percentage"
    ? (Number.isNaN(parsedValue) ? 0 : (previewOrderAmount * parsedValue) / 100)
    : (Number.isNaN(parsedValue) ? 0 : parsedValue);
  const previewCashback = parsedMaxCashbackAmount != null && !Number.isNaN(parsedMaxCashbackAmount)
    ? Math.min(previewRawCashback, parsedMaxCashbackAmount)
    : previewRawCashback;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setFormError(null);

    try {
      await onSubmit({
        name: name.trim(),
        type,
        value: parsedValue,
        minOrderAmount: parsedMinOrderAmount,
        maxCashbackAmount: parsedMaxCashbackAmount,
        isActive,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to save cashback rule.");
    }
  };

  return (
    <Card className="max-w-3xl">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-primary">Rule details</h2>
        <p className="text-sm text-third">
          Cashback is awarded once when an order reaches the delivered paid state.
        </p>
      </div>

      <Input label="Rule name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="Weekend cashback" />

      <Select
        label="Reward type"
        value={type}
        onChange={(val) => setType(val as string)}
        options={typeOptions}
        search={false}
      />

      <Input
        label={type === "percentage" ? "Reward value (%)" : "Reward value (JOD)"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        type="number"
        step="0.01"
        min="0"
        error={errors.value}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Min Order Amount"
          value={minOrderAmount}
          onChange={(e) => setMinOrderAmount(e.target.value)}
          type="number"
          step="0.01"
          min="0"
          error={errors.minOrderAmount}
          placeholder="0.00"
        />
        <Input
          label="Max Cashback Amount"
          value={maxCashbackAmount}
          onChange={(e) => setMaxCashbackAmount(e.target.value)}
          type="number"
          step="0.01"
          min="0"
          error={errors.maxCashbackAmount}
          placeholder="Leave empty for no cap"
        />
      </div>

      <Card variant="nested" className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-primary">Reward preview</p>
            <p className="text-sm text-third">
              On a {previewOrderAmount.toFixed(2)} JOD order, this rule gives {previewCashback.toFixed(2)} JOD.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-third">Current mode</p>
            <p className="text-base font-semibold text-primary">
              {type === "percentage" ? `${Number.isNaN(parsedValue) ? 0 : parsedValue}%` : `${Number.isNaN(parsedValue) ? 0 : parsedValue.toFixed(2)} JOD`}
            </p>
          </div>
        </div>
      </Card>

      <Checkbox checked={isActive} onChange={setIsActive} label="Rule is active" />

      {formError ? <p className="text-sm text-danger">{formError}</p> : null}

      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isLoading}
          color="var(--color-primary)"
        >
          {isLoading ? "Saving..." : submitLabel}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
