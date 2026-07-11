"use client";

import { useEffect, useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";
import { PageHeader } from "../src/components/common/PageHeader";
import { Card } from "../src/components/ui/card";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { IconButton } from "../src/components/ui/icon-button";
import { EmptyState } from "../src/components/common/EmptyState";
import { DeleteConfirmationModal } from "../src/components/common/DeleteConfirmationModal";
import {
  ConceptInlineForm,
  type ConceptFormPayload,
} from "../src/components/concepts/ConceptInlineForm";
import { Pagination, type PaginationData } from "../src/components/ui/pagination";
import { PAGINATION } from "../src/lib/constants";
import {
  useConceptCoverage,
  useCreateTermGroup,
  useDeleteTermGroup,
  useTermGroups,
  useUpdateTermGroup,
} from "../src/services/terms/hooks/use-terms";
import type { TermGroupItem } from "../src/services/terms/types/term.types";

export default function ConceptsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState<number>(PAGINATION.defaultPage);
  const [pageSize, setPageSize] = useState<number>(PAGINATION.defaultPageSize);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [conceptToDelete, setConceptToDelete] = useState<TermGroupItem | null>(null);

  const { data: coverage } = useConceptCoverage();
  const { data, isLoading, isError, error, refetch } = useTermGroups({
    page,
    per_page: pageSize,
    search: search.trim() || undefined,
  });
  const createConcept = useCreateTermGroup();
  const updateConcept = useUpdateTermGroup();
  const deleteConcept = useDeleteTermGroup();

  useEffect(() => {
    setPage(1);
  }, [search]);

  const concepts = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, data?.total_pages ?? Math.ceil(total / pageSize));

  const paginationData: PaginationData = useMemo(
    () => ({
      currentPage: page,
      pageSize,
      totalItems: total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    }),
    [page, pageSize, total, totalPages],
  );

  const handleCreate = async (payload: ConceptFormPayload) => {
    await createConcept.mutateAsync(payload);
    setIsCreating(false);
  };

  const handleUpdate = async (id: number, payload: ConceptFormPayload) => {
    await updateConcept.mutateAsync({
      id,
      data: payload,
    });
    setEditingId(null);
  };

  const handleConfirmDelete = async () => {
    if (!conceptToDelete) {
      return;
    }
    try {
      await deleteConcept.mutateAsync(conceptToDelete.group_id);
    } finally {
      setConceptToDelete(null);
    }
  };

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Lightbulb />}
        title="Concepts"
        description="Browse and manage search concepts with bilingual terms and linked products."
        action={{
          label: isCreating ? "Close" : "Add Concept",
          onClick: () => {
            setIsCreating((current) => !current);
            setEditingId(null);
          },
        }}
      />

      {coverage ? (
        <Card>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Products</p>
              <p className="text-lg font-semibold">{coverage.total_products}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Concepts</p>
              <p className="text-lg font-semibold">{coverage.concept_groups}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Referenced</p>
              <p className="text-lg font-semibold">{coverage.referenced_products}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Unreferenced</p>
              <p
                className={`text-lg font-semibold ${
                  coverage.unreferenced_products > 0 ? "text-danger" : "text-success"
                }`}
              >
                {coverage.unreferenced_products}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {isCreating ? (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Add Concept</h2>
          <ConceptInlineForm
            mode="create"
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
            isSubmitting={createConcept.isPending}
          />
        </Card>
      ) : null}

      <Card>
        <Input
          label="Search concepts"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by key, label, or term..."
          isSearch
        />
      </Card>

      {isError ? (
        <Card>
          <EmptyState
            icon={<Lightbulb />}
            title="Failed to load concepts"
            description={(error as Error)?.message || "Please try again."}
          />
          <div className="flex justify-center">
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </Card>
      ) : isLoading ? (
        <Card>
          <p className="text-sm text-gray-500">Loading concepts...</p>
        </Card>
      ) : concepts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Lightbulb />}
            title="No concepts found"
            description={
              search.trim()
                ? "No concepts match your search."
                : "Generate concepts from Settings or add one manually."
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {concepts.map((group) => {
            const isEditing = editingId === group.group_id;

            return (
              <Card key={group.group_id}>
                {isEditing ? (
                  <>
                    <h2 className="mb-4 text-lg font-semibold">Edit Concept</h2>
                    <ConceptInlineForm
                      mode="edit"
                      concept={group}
                      onSubmit={(payload) => handleUpdate(group.group_id, payload)}
                      onCancel={() => setEditingId(null)}
                      isSubmitting={updateConcept.isPending}
                    />
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-primary">
                          {group.concept_label_en ||
                            group.concept_label_ar ||
                            group.concept_key}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Key: <span className="font-mono">{group.concept_key}</span>
                          {group.concept_label_ar ? (
                            <span className="mx-2">·</span>
                          ) : null}
                          {group.concept_label_ar ? (
                            <span dir="rtl">{group.concept_label_ar}</span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Reference products:{" "}
                          {group.reference_product_ids.length > 0
                            ? group.reference_product_ids.join(", ")
                            : "-"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <IconButton
                          variant="edit"
                          onClick={() => {
                            setIsCreating(false);
                            setEditingId(group.group_id);
                          }}
                          title="Edit concept"
                        />
                        <IconButton
                          variant="delete"
                          onClick={() => setConceptToDelete(group)}
                          title="Delete concept"
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Terms EN ({group.terms_en.length})
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.terms_en.map((term) => (
                            <span
                              key={`${group.group_id}-en-${term}`}
                              className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
                            >
                              {term}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Terms AR ({group.terms_ar.length})
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2" dir="rtl">
                          {group.terms_ar.map((term) => (
                            <span
                              key={`${group.group_id}-ar-${term}`}
                              className="rounded-full bg-secondary/15 px-2.5 py-1 text-xs text-gray-800"
                            >
                              {term}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            );
          })}

          {total > 0 ? (
            <Pagination
              pagination={paginationData}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={[...PAGINATION.pageSizeOptions]}
            />
          ) : null}
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={!!conceptToDelete}
        onClose={() => setConceptToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete concept"
        message="This will permanently delete the concept and all of its terms."
        itemName={conceptToDelete?.concept_key ?? undefined}
        isLoading={deleteConcept.isPending}
      />
    </div>
  );
}
