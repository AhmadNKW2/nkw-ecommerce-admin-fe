"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GitMerge,
  Link2,
  Package,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "@/providers/loading-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import {
  ProductsPageHeader,
  type ProductsViewMode,
} from "@/components/products/ProductsPageHeader";
import {
  useMergeDuplicateReferenceSlugs,
  useProducts,
} from "@/services/products/hooks/use-products";
import { productService } from "@/services/products/api/product.service";
import type {
  MergeDuplicateReferenceSlugGroup,
  MergeDuplicateReferenceSlugsResult,
  ProductDetail,
} from "@/services/products/types/product.types";
import { useVendors } from "@/services/vendors/hooks/use-vendors";
import { normalizeExternalUrl, openReferenceLink } from "@/lib/reference-link";
import { showErrorToast } from "@/lib/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProductReferenceLinksWorkspaceProps {
  title?: string;
  description?: string;
  showViewToggle?: boolean;
  showReviewViewToggle?: boolean;
  showPricingViewToggle?: boolean;
  showReferenceLinksViewToggle?: boolean;
  showStatusFilter?: boolean;
  showBulkStatusChange?: boolean;
  viewMode?: ProductsViewMode;
  onViewModeChange?: (mode: ProductsViewMode) => void;
}

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "default" | "warning" | "success";
}) {
  const toneClasses =
    tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50"
        : "border-slate-200 bg-slate-50";

  return (
    <Card className={`border ${toneClasses}`} noFlex>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{hint}</p>
    </Card>
  );
}

function MergeGroupRow({
  group,
  vendorName,
  expanded,
  onToggle,
}: {
  group: MergeDuplicateReferenceSlugGroup;
  vendorName: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const totalProducts = 1 + group.deleted_product_ids.length;

  return (
    <>
      <TableRow className="align-top">
        <TableCell className="w-10">
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-full p-0"
            onClick={onToggle}
            aria-label={expanded ? "Collapse group" : "Expand group"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            <p className="font-medium text-slate-900">#{group.keeper_product_id}</p>
            <p className="text-xs text-slate-500">Keeper product</p>
          </div>
        </TableCell>
        <TableCell>
          <p className="font-medium text-slate-900">{vendorName}</p>
          <p className="mt-1 text-xs text-slate-500">Vendor ID {group.vendor_id}</p>
        </TableCell>
        <TableCell>
          <p className="max-w-xs truncate font-mono text-xs text-slate-700" title={group.reference_slug}>
            {group.reference_slug}
          </p>
        </TableCell>
        <TableCell>
          <Badge variant="warning">{totalProducts} products</Badge>
        </TableCell>
        <TableCell>
          <Badge variant="success">{group.merged_reference_links.length} links</Badge>
        </TableCell>
        <TableCell>
          <Badge>{group.merged_original_vendor_categories.length} categories</Badge>
        </TableCell>
        <TableCell className="text-right">
          <Button
            variant="outline"
            className="rounded-full px-3 py-1.5 text-sm"
            onClick={() => router.push(`/products/${group.keeper_product_id}`)}
          >
            Open keeper
          </Button>
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow>
          <TableCell colSpan={8} className="bg-slate-50/80">
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800">Will be removed</p>
                <div className="flex flex-wrap gap-2">
                  {group.deleted_product_ids.map((productId) => (
                    <Badge key={productId} variant="warning">
                      #{productId}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800">Merged reference links</p>
                <div className="space-y-2">
                  {group.merged_reference_links.map((link) => (
                    <button
                      key={link}
                      type="button"
                      className="flex w-full items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                      onClick={() => openReferenceLink(link)}
                    >
                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="break-all">{link}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="mb-2 text-sm font-semibold text-slate-800">Merged original categories</p>
                <div className="flex flex-wrap gap-2">
                  {group.merged_original_vendor_categories.length > 0 ? (
                    group.merged_original_vendor_categories.map((category, index) => (
                      <Badge key={`${category.id ?? "name"}-${index}`}>
                        {category.name ?? `Category ${category.id}`}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">No original categories</span>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

export function ProductReferenceLinksWorkspace({
  title = "Products",
  description = "Clean up duplicate supplier references and inspect products by link or slug.",
  showViewToggle = false,
  showReviewViewToggle = true,
  showPricingViewToggle = false,
  showReferenceLinksViewToggle = true,
  viewMode = "reference-links",
  onViewModeChange,
}: ProductReferenceLinksWorkspaceProps) {
  const router = useRouter();
  const { setShowOverlay } = useLoading();
  const [vendorFilter, setVendorFilter] = useState("");
  const [preview, setPreview] = useState<MergeDuplicateReferenceSlugsResult | null>(null);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);

  const [lookupLink, setLookupLink] = useState("");
  const [lookupSlug, setLookupSlug] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<ProductDetail | null>(null);
  const [lookupNotFound, setLookupNotFound] = useState(false);

  const { data: vendorsData } = useVendors({ limit: 1000 });
  const vendors = vendorsData?.data ?? [];

  const vendorOptions = useMemo(
    () => [
      { value: "", label: "All vendors" },
      ...vendors.map((vendor) => ({
        value: String(vendor.id),
        label: vendor.name_en,
      })),
    ],
    [vendors],
  );

  const vendorNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const vendor of vendors) {
      map.set(vendor.id, vendor.name_en);
    }
    return map;
  }, [vendors]);

  const duplicateLinksQuery = useProducts({
    page: 1,
    limit: 1,
    has_duplicate_reference_link: true,
  });

  const mergeMutation = useMergeDuplicateReferenceSlugs();

  const loadPreview = async (vendorId?: number) => {
    setShowOverlay(true);
    try {
      const response = await mergeMutation.mutateAsync({
        dry_run: true,
        vendor_id: vendorId,
      });
      setPreview(response.data ?? null);
      setExpandedGroupKey(null);
    } finally {
      setShowOverlay(false);
    }
  };

  useEffect(() => {
    void loadPreview(
      vendorFilter ? Number(vendorFilter) : undefined,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorFilter]);

  const handleLookup = async () => {
    const link = lookupLink.trim();
    const slug = lookupSlug.trim();

    if (!link && !slug) {
      showErrorToast("Enter a reference link or reference slug to search.");
      return;
    }

    setLookupLoading(true);
    setLookupResult(null);
    setLookupNotFound(false);

    try {
      const response = await productService.getProductByReference({
        reference_link: link || undefined,
        reference_slug: slug || undefined,
      });
      setLookupResult(response.data ?? null);
    } catch {
      setLookupNotFound(true);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleRunMerge = async () => {
    setShowOverlay(true);
    try {
      const response = await mergeMutation.mutateAsync({
        dry_run: false,
        vendor_id: vendorFilter ? Number(vendorFilter) : undefined,
      });
      setPreview(response.data ?? null);
      setMergeModalOpen(false);
      await duplicateLinksQuery.refetch();
    } finally {
      setShowOverlay(false);
    }
  };

  const duplicateLinkCount =
    duplicateLinksQuery.data?.data?.pagination?.total ?? 0;

  return (
    <div className="admin-page">
      <ProductsPageHeader
        title={title}
        description={description}
        onCreate={() => router.push("/products/create")}
        showCreate={false}
        showViewToggle={showViewToggle}
        showReviewViewToggle={showReviewViewToggle}
        showPricingViewToggle={showPricingViewToggle}
        showReferenceLinksViewToggle={showReferenceLinksViewToggle}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Duplicate slug groups"
          value={preview?.groups_found ?? "—"}
          hint="Same vendor + same reference slug"
          tone="warning"
        />
        <StatCard
          label="Products to remove"
          value={
            preview
              ? preview.groups.reduce(
                  (sum, group) => sum + group.deleted_product_ids.length,
                  0,
                )
              : "—"
          }
          hint="Duplicates that will be permanently deleted"
          tone="warning"
        />
        <StatCard
          label="Duplicate reference links"
          value={duplicateLinkCount}
          hint="Products sharing the exact same reference URL"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <GitMerge className="h-5 w-5 text-[var(--color-primary2)]" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Merge duplicate reference slugs
                </h2>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                For each group with the same vendor and reference slug, the lowest
                product ID is kept. All reference links and original vendor categories
                are merged into that product, then the duplicates are removed.
              </p>
            </div>
            <div className="w-full max-w-xs">
              <Select
                label="Vendor"
                value={vendorFilter}
                onChange={(value) => setVendorFilter(Array.isArray(value) ? value[0] ?? "" : value)}
                options={vendorOptions}
                search
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() =>
                void loadPreview(vendorFilter ? Number(vendorFilter) : undefined)
              }
              disabled={mergeMutation.isPending}
            >
              Refresh preview
            </Button>
            <Button
              color="var(--color-primary2)"
              className="rounded-full"
              onClick={() => setMergeModalOpen(true)}
              disabled={!preview || preview.groups_found === 0 || mergeMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Run merge
            </Button>
          </div>

          {preview?.skipped_groups?.length ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {preview.skipped_groups.length} group(s) were skipped during the last operation.
            </div>
          ) : null}

          <div className="mt-6 overflow-x-auto">
            {preview && preview.groups.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{" "}</TableHead>
                    <TableHead>Keeper</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Reference slug</TableHead>
                    <TableHead>Group size</TableHead>
                    <TableHead>Links</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.groups.map((group) => {
                    const groupKey = `${group.vendor_id}:${group.reference_slug}`;
                    return (
                      <MergeGroupRow
                        key={groupKey}
                        group={group}
                        vendorName={vendorNameById.get(group.vendor_id) ?? `Vendor ${group.vendor_id}`}
                        expanded={expandedGroupKey === groupKey}
                        onToggle={() =>
                          setExpandedGroupKey((current) =>
                            current === groupKey ? null : groupKey,
                          )
                        }
                      />
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={<Package />}
                title="No duplicate slug groups"
                description="There are no products sharing the same vendor and reference slug for the selected filter."
              />
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-[var(--color-primary2)]" />
            <h2 className="text-lg font-semibold text-slate-900">
              Find product by reference
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Search by supplier URL, reference slug, or both together.
          </p>

          <div className="mt-4 space-y-3">
            <Input
              label="Reference link"
              placeholder="https://vendor.com/product/example"
              value={lookupLink}
              onChange={(event) => setLookupLink(event.target.value)}
            />
            <Input
              label="Reference slug"
              placeholder="example-product-slug"
              value={lookupSlug}
              onChange={(event) => setLookupSlug(event.target.value)}
            />
            <Button
              color="var(--color-primary2)"
              className="w-full rounded-full"
              onClick={() => void handleLookup()}
              disabled={lookupLoading}
            >
              <Link2 className="mr-2 h-4 w-4" />
              {lookupLoading ? "Searching..." : "Search product"}
            </Button>
          </div>

          {lookupNotFound ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">No product found</p>
                <p className="mt-1">This reference link or slug is not linked to any product yet.</p>
              </div>
            </div>
          ) : null}

          {lookupResult ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{lookupResult.name_en}</p>
                  <p className="mt-1 text-sm text-slate-600">Product #{lookupResult.id}</p>
                </div>
                <Badge variant={lookupResult.status === "active" ? "success" : "warning"}>
                  {lookupResult.status}
                </Badge>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <p>
                  <span className="font-medium">SKU:</span> {lookupResult.sku}
                </p>
                <p className="break-all">
                  <span className="font-medium">Slug:</span>{" "}
                  {lookupResult.reference_slug || "—"}
                </p>
              </div>

              {(lookupResult.reference_links?.length ?? 0) > 0 ? (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-slate-800">Reference links</p>
                  {lookupResult.reference_links?.map((link) => (
                    <button
                      key={link}
                      type="button"
                      className="flex w-full items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 hover:bg-white/80"
                      onClick={() => openReferenceLink(link)}
                    >
                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="break-all">{link}</span>
                    </button>
                  ))}
                </div>
              ) : lookupResult.reference_link ? (
                <button
                  type="button"
                  className="mt-4 flex w-full items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 hover:bg-white/80"
                  onClick={() => openReferenceLink(lookupResult.reference_link)}
                >
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="break-all">{lookupResult.reference_link}</span>
                </button>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => router.push(`/products/${lookupResult.id}`)}
                >
                  Open product
                </Button>
                {normalizeExternalUrl(lookupResult.reference_link) ? (
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => openReferenceLink(lookupResult.reference_link)}
                  >
                    Open supplier link
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      <Card variant="nested">
        <h3 className="text-base font-semibold text-slate-900">How this cleanup works</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Preview shows every group where products share the same vendor and reference slug.</li>
          <li>The keeper is always the product with the lowest ID in the group.</li>
          <li>All supplier URLs are combined into `reference_links` on the keeper product.</li>
          <li>All original vendor categories from the group are merged onto the keeper.</li>
          <li>Duplicate products are permanently deleted after the merge.</li>
        </ol>
      </Card>

      <DeleteConfirmationModal
        isOpen={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        onConfirm={() => void handleRunMerge()}
        title="Run duplicate slug merge?"
        message={`This will merge ${preview?.groups_found ?? 0} duplicate group(s) and permanently delete ${preview ? preview.groups.reduce((sum, group) => sum + group.deleted_product_ids.length, 0) : 0} product(s). This cannot be undone.`}
        confirmText="Run merge"
        isLoading={mergeMutation.isPending}
        isPermanent
      />
    </div>
  );
}
