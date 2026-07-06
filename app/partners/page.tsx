"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "../src/providers/loading-provider";
import { useDeletePartner, usePartners } from "../src/services/partners/hooks/use-partners";
import type { PartnerListParams, Partner } from "../src/services/partners/types/partner.types";
import { PageHeader } from "../src/components/common/PageHeader";
import { Card } from "../src/components/ui/card";
import { Input } from "../src/components/ui/input";
import { Select } from "../src/components/ui/select";
import { Button } from "../src/components/ui/button";
import { IconButton } from "../src/components/ui/icon-button";
import { EmptyState } from "../src/components/common/EmptyState";
import { DeleteConfirmationModal } from "../src/components/common/DeleteConfirmationModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../src/components/ui/table";
import { PAGINATION } from "../src/lib/constants";

export default function PartnersPage() {
  const router = useRouter();
  const { setShowOverlay } = useLoading();
  const [searchTerm, setSearchTerm] = useState("");
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const [queryParams, setQueryParams] = useState<PartnerListParams>({
    page: PAGINATION.defaultPage,
    limit: PAGINATION.defaultPageSize,
    sortBy: "created_at",
    sortOrder: "DESC",
  });

  const { data, isLoading, isError, error, refetch } = usePartners(queryParams);
  const deletePartner = useDeletePartner();

  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setQueryParams((prev) => ({
        ...prev,
        page: PAGINATION.defaultPage,
        search: searchTerm.trim() || undefined,
      }));
    }, 400);

    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const partners = data?.data ?? [];
  const pagination = data?.pagination;

  const handleDeleteConfirm = async () => {
    if (!partnerToDelete) {
      return;
    }

    await deletePartner.mutateAsync(partnerToDelete.id);
    setPartnerToDelete(null);
  };

  if (isError) {
    return (
      <div className="admin-page">
        <PageHeader
          icon={<Building2 />}
          title="Partners"
          description="Manage partner contacts and companies"
          action={{
            label: "Create Partner",
            onClick: () => router.push("/partners/create"),
          }}
        />
        <Card>
          <EmptyState
            icon={<Building2 />}
            title="Failed to load partners"
            description={(error as any)?.message || "Please try again."}
          />
          <div className="flex justify-center">
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Building2 />}
        title="Partners"
        description="Manage partner contacts and companies"
        action={{
          label: "Create Partner",
          onClick: () => router.push("/partners/create"),
        }}
      />

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex-1">
            <Input
              label="Search"
              placeholder="Search by name or company"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              isSearch
            />
          </div>

          <div className="w-full lg:w-64">
            <Select
              label="Sort By"
              value={queryParams.sortBy || "created_at"}
              onChange={(value) =>
                setQueryParams((prev) => ({
                  ...prev,
                  page: PAGINATION.defaultPage,
                  sortBy: (Array.isArray(value) ? value[0] : value) as PartnerListParams["sortBy"],
                }))
              }
              options={[
                { value: "created_at", label: "Created At" },
                { value: "full_name", label: "Full Name" },
                { value: "company_name", label: "Company Name" },
              ]}
              multiple={false}
            />
          </div>

          <div className="w-full lg:w-56">
            <Select
              label="Sort Order"
              value={queryParams.sortOrder || "DESC"}
              onChange={(value) =>
                setQueryParams((prev) => ({
                  ...prev,
                  page: PAGINATION.defaultPage,
                  sortOrder: (Array.isArray(value) ? value[0] : value) as PartnerListParams["sortOrder"],
                }))
              }
              options={[
                { value: "DESC", label: "Newest First" },
                { value: "ASC", label: "Oldest First" },
              ]}
              multiple={false}
            />
          </div>
        </div>
      </Card>

      {!isLoading && partners.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 />}
            title="No partners found"
            description={
              searchTerm.trim()
                ? "No partners match your search."
                : "Create your first partner to start managing partner records."
            }
          />
          {!searchTerm.trim() ? (
            <div className="flex justify-center">
              <Button onClick={() => router.push("/partners/create")}>Create Partner</Button>
            </div>
          ) : null}
        </Card>
      ) : (
        <Table
          pagination={
            pagination
              ? {
                  currentPage: pagination.page,
                  pageSize: pagination.limit,
                  totalItems: pagination.total,
                  totalPages: pagination.totalPages,
                  hasNextPage: pagination.page < pagination.totalPages,
                  hasPreviousPage: pagination.page > 1,
                }
              : undefined
          }
          onPageChange={(page) => setQueryParams((prev) => ({ ...prev, page }))}
          onPageSizeChange={(pageSize) =>
            setQueryParams((prev) => ({
              ...prev,
              page: PAGINATION.defaultPage,
              limit: pageSize,
            }))
          }
        >
          <TableHeader>
            <TableRow isHeader>
              <TableHead width="8%">#</TableHead>
              <TableHead width="24%">Full Name</TableHead>
              <TableHead width="28%">Company Name</TableHead>
              <TableHead width="20%">Phone Number</TableHead>
              <TableHead width="12%">Created At</TableHead>
              <TableHead width="8%">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners.map((partner) => (
              <TableRow
                key={partner.id}
                className="hover:bg-primary/5"
                onClick={() => router.push(`/partners/${partner.id}`)}
              >
                <TableCell className="font-mono text-sm">{partner.id}</TableCell>
                <TableCell className="font-medium">{partner.full_name}</TableCell>
                <TableCell>{partner.company_name}</TableCell>
                <TableCell>{partner.phone_number}</TableCell>
                <TableCell>
                  {partner.created_at ? new Date(partner.created_at).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <IconButton
                      variant="edit"
                      title="Edit partner"
                      href={`/partners/${partner.id}`}
                      onClick={(event) => event?.stopPropagation()}
                    />
                    <IconButton
                      variant="delete"
                      title="Delete partner"
                      onClick={(event) => {
                        event?.stopPropagation();
                        setPartnerToDelete(partner);
                      }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <DeleteConfirmationModal
        isOpen={!!partnerToDelete}
        onClose={() => setPartnerToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Partner"
        message={`Are you sure you want to delete "${partnerToDelete?.full_name}" from ${partnerToDelete?.company_name}?`}
        isLoading={deletePartner.isPending}
      />
    </div>
  );
}