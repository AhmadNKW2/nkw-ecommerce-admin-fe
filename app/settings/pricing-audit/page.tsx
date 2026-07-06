"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  Search,
} from "lucide-react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { SettingsNav } from "../../src/components/settings/SettingsNav";
import { Card } from "../../src/components/ui/card";
import { Input } from "../../src/components/ui/input";
import { Toggle } from "../../src/components/ui/toggle";
import { Button } from "../../src/components/ui/button";
import { Textarea } from "../../src/components/ui/textarea";
import { Badge } from "../../src/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../src/components/ui/table";
import {
  ImportedPricingAuditFilters,
  SyncImportedPricingResult,
} from "../../src/services/settings/types/settings.types";
import {
  useImportedPricingAudit,
  useSyncImportedPricing,
} from "../../src/services/settings/hooks/use-settings";

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "None";
  }

  return value.toFixed(2);
}

function formatRawValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "None";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function parseProductIds(value: string): number[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  );
}

export default function PricingAuditPage() {
  const [filters, setFilters] = useState<ImportedPricingAuditFilters>({
    page: 1,
    limit: 50,
    mismatch_only: true,
    product_ids: "",
  });
  const [draftProductIds, setDraftProductIds] = useState("");
  const [submittedSyncIds, setSubmittedSyncIds] = useState("");
  const [lastSyncResult, setLastSyncResult] =
    useState<SyncImportedPricingResult | null>(null);

  const queryParams = useMemo(
    () => ({
      ...filters,
      product_ids: filters.product_ids?.trim() || undefined,
    }),
    [filters],
  );

  const { data, isLoading, isError, error, refetch, isFetching } =
    useImportedPricingAudit(queryParams);
  const syncImportedPricing = useSyncImportedPricing();
  const auditMeta = data?.meta ?? {
    page: 1,
    limit: Number(filters.limit ?? 50),
    total: 0,
    total_scanned: 0,
    total_mismatches: 0,
  };

  const handleSearch = () => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      product_ids: draftProductIds,
    }));
  };

  const handleUseCurrentMismatches = () => {
    const ids = data?.data
      ?.filter((item) => item.is_mismatch)
      .map((item) => item.product_id)
      .join(",");

    setSubmittedSyncIds(ids ?? "");
  };

  const handleSync = async (dryRun: boolean) => {
    const productIds = parseProductIds(submittedSyncIds);

    if (productIds.length === 0) {
      window.alert("Enter at least one valid product id.");
      return;
    }

    if (
      !dryRun &&
      !window.confirm(
        `Apply imported pricing sync for ${productIds.length} product(s)? This will update stored pricing fields from input_json.`,
      )
    ) {
      return;
    }

    const response = await syncImportedPricing.mutateAsync({
      product_ids: productIds,
      dry_run: dryRun,
    });

    setLastSyncResult(response.data);

    if (!dryRun) {
      refetch();
    }
  };

  const canGoPrevious = auditMeta.page > 1;
  const canGoNext =
    auditMeta.page * auditMeta.limit < auditMeta.total;

  return (
    <div className="admin-page">
      <PageHeader
        icon={<BarChart3 />}
        title="Pricing Audit"
        description="Audit imported pricing from product_input_jsons.input_json and sync only reviewed batches."
        extraActions={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              {isFetching ? "Refreshing..." : "Refresh"}
            </span>
          </Button>
        }
      />

      <SettingsNav />

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-80 flex-1">
            <Input
              label="Product IDs"
              value={draftProductIds}
              onChange={(event) => setDraftProductIds(event.target.value)}
              placeholder="1410,1589"
            />
          </div>

          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <Toggle
              checked={filters.mismatch_only ?? true}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  page: 1,
                  mismatch_only: value,
                }))
              }
              label="Mismatch Only"
            />
          </div>

          <div className="w-28">
            <Input
              label="Limit"
              type="number"
              min={1}
              value={filters.limit ?? 50}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  limit: Number.isNaN(event.target.valueAsNumber)
                    ? 50
                    : event.target.valueAsNumber,
                }))
              }
            />
          </div>

          <Button onClick={handleSearch}>
            <span className="inline-flex items-center gap-2">
              <Search className="h-4 w-4" />
              Run Audit
            </span>
          </Button>
        </div>
      </Card>

      {data ? (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-4">
          <Card>
            <p className="text-sm text-gray-500">Page Results</p>
            <p className="text-2xl font-bold text-primary">{auditMeta.total}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Scanned</p>
            <p className="text-2xl font-bold text-primary">{auditMeta.total_scanned}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Mismatches</p>
            <p className="text-2xl font-bold text-danger">
              {auditMeta.total_mismatches}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Current Page</p>
            <p className="text-2xl font-bold text-primary">{auditMeta.page}</p>
          </Card>
        </div>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Batch Sync</h2>
            <p className="mt-1 text-sm text-gray-500">
              Start with a dry run, then apply only reviewed product ids in small
              batches.
            </p>
          </div>
          <Button variant="outline" onClick={handleUseCurrentMismatches}>
            Use Current Mismatches
          </Button>
        </div>

        <Textarea
          label="Product IDs To Sync"
          value={submittedSyncIds}
          onChange={(event) => setSubmittedSyncIds(event.target.value)}
          rows={3}
          placeholder="1410,1589"
        />

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => handleSync(true)}
            disabled={syncImportedPricing.isPending}
          >
            {syncImportedPricing.isPending ? "Running..." : "Dry Run Selected IDs"}
          </Button>
          <Button
            onClick={() => handleSync(false)}
            disabled={syncImportedPricing.isPending}
          >
            {syncImportedPricing.isPending ? "Applying..." : "Apply Sync"}
          </Button>
        </div>

        {lastSyncResult ? (
          <div className="rounded-r1 bg-gray-50 p-4 text-sm text-gray-700">
            <div className="flex items-center gap-2 font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Last sync result
            </div>
            <p className="mt-2">
              Requested: {lastSyncResult.total_requested}, Found:{" "}
              {lastSyncResult.total_found}
              {lastSyncResult.dry_run
                ? `, Mismatches: ${lastSyncResult.total_mismatches ?? 0}`
                : `, Updated: ${lastSyncResult.updated ?? 0}, Failed: ${lastSyncResult.failed ?? 0}, Skipped: ${lastSyncResult.skipped ?? 0}`}
            </p>
          </div>
        ) : null}
      </Card>

      <Card>
        {isError ? (
          <div className="rounded-r1 border border-danger/20 bg-danger/5 p-5">
            <div className="flex items-center gap-3 text-danger">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Unable to load pricing audit</p>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {error instanceof Error ? error.message : "An error occurred while loading the audit."}
            </p>
          </div>
        ) : (
          <Table noPagination emptyMessage="No pricing audit records matched the current filters.">
            <TableHeader>
              <TableRow isHeader>
                <TableHead width="7%">ID</TableHead>
                <TableHead width="17%">Product</TableHead>
                <TableHead width="9%">Status</TableHead>
                <TableHead width="11%">Input Shape</TableHead>
                <TableHead width="15%">Input Prices</TableHead>
                <TableHead width="15%">Current</TableHead>
                <TableHead width="15%">Expected</TableHead>
                <TableHead width="11%">Mismatch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.data ?? []).map((item) => (
                <TableRow key={item.product_id}>
                  <TableCell>{item.product_id}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-primary line-clamp-2">
                        {item.name_en || "Unnamed product"}
                      </p>
                      {item.error ? (
                        <p className="text-xs text-danger line-clamp-2">{item.error}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === "review" ? "warning" : "default"}>
                      {item.status || "unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.input_shape}</TableCell>
                  <TableCell className="text-xs">
                    <div>new: {formatRawValue(item.input_pricing.new_price)}</div>
                    <div>old: {formatRawValue(item.input_pricing.old_price)}</div>
                    <div>price: {formatRawValue(item.input_pricing.price)}</div>
                    <div>sale: {formatRawValue(item.input_pricing.sale_price)}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>OVP: {formatMoney(item.current.original_vendor_price)}</div>
                    <div>OVSP: {formatMoney(item.current.original_vendor_sale_price)}</div>
                    <div>P: {formatMoney(item.current.price)}</div>
                    <div>S: {formatMoney(item.current.sale_price)}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>OVP: {formatMoney(item.expected?.original_vendor_price)}</div>
                    <div>OVSP: {formatMoney(item.expected?.original_vendor_sale_price)}</div>
                    <div>P: {formatMoney(item.expected?.price)}</div>
                    <div>S: {formatMoney(item.expected?.sale_price)}</div>
                  </TableCell>
                  <TableCell>
                    {item.mismatch_fields.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.mismatch_fields.map((field) => (
                          <Badge key={field} variant="danger" className="px-2 py-0.5">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="success">Match</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {data ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Showing page {auditMeta.page} of{" "}
              {Math.max(1, Math.ceil(auditMeta.total / auditMeta.limit))}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }))
                }
                disabled={!canGoPrevious}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))
                }
                disabled={!canGoNext}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
