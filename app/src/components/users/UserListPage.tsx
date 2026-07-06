"use client";

/**
 * User List Page Component
 * Shared component for displaying and managing users (customers and admins)
 */

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useSessionStoragePage } from "@/hooks/use-session-storage-page";
import { useLoading } from "../../providers/loading-provider";
import { useCustomers, useDeleteCustomer } from "../../services/customers/hooks/use-customers";
import { Users, Shield, RefreshCw, AlertCircle, X, Mail, User } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { PageHeader } from "../common/PageHeader";
import { EmptyState } from "../common/EmptyState";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { IconButton } from "../ui/icon-button";
import { Pagination } from "../ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { DeleteConfirmationModal } from "../common/DeleteConfirmationModal";
import { UserViewModal } from "./UserViewModal";
import { Customer, CustomerFilters, getCustomerFullName, UserRole } from "../../services/customers/types/customer.types";

export interface UserListPageProps {
  userType: "customer" | "admin";
}

export const UserListPage: React.FC<UserListPageProps> = ({ userType }) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const { page, setPage, limit, setLimit } = useSessionStoragePage(userType === "admin" ? "admins" : "customers");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Customer | null>(null);
  const [userToView, setUserToView] = useState<Customer | null>(null);

  const isAdmin = userType === "admin";
  const role: CustomerFilters["role"] = isAdmin
    ? ["admin", "constant_token_admin", "catalog_manager"]
    : "user";
  const basePath = isAdmin ? "/admins" : "/customers";
  const label = isAdmin ? "Admin" : "Customer";
  const labelPlural = isAdmin ? "Admins" : "Customers";
  const Icon = isAdmin ? Shield : Users;

  // Build filters for API
  const filters: CustomerFilters = useMemo(() => ({
    page,
    limit,
    role,
    ...(searchTerm && { search: searchTerm }),
  }), [page, searchTerm, role]);

  const { data, isLoading, isError, error, refetch } = useCustomers(filters);
  const deleteCustomer = useDeleteCustomer();

  // Show loading overlay while data is loading
  const { setShowOverlay } = useLoading();
  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  // Extract users and meta from response
  const users = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit: 10, totalPages: 1 };

  const handleView = (user: Customer) => {
    setUserToView(user);
    setViewModalOpen(true);
  };

  const handleEdit = (user: Customer) => {
    router.push(`${basePath}/${user.id}`);
  };

  const handleViewEdit = () => {
    if (userToView) {
      setViewModalOpen(false);
      router.push(`${basePath}/${userToView.id}`);
    }
  };

  const handleDeleteClick = (user: Customer) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (userToDelete) {
      try {
        await deleteCustomer.mutateAsync(userToDelete.id);
        setDeleteModalOpen(false);
        setUserToDelete(null);
      } catch (error) {
        console.error(`Failed to delete ${label.toLowerCase()}:`, error);
      }
    }
  };

  const handleCreateNew = () => {
    router.push(`${basePath}/create`);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setPage(1);
  };

  const hasActiveFilters = !!searchTerm;

  if (isError) {
    return (
      <div className="admin-state-page">
        <div className="mx-auto">
          <Card>
            <div className="p-12 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-danger/10 p-3">
                  <AlertCircle className="h-8 w-8 text-danger" />
                </div>
              </div>
              <h3 className="text-xl font-bold mt-4">Error Loading {labelPlural}</h3>
              <p className="mt-2 max-w-md mx-auto">
                {error instanceof Error ? error.message : "An error occurred"}
              </p>
              <Button onClick={() => refetch()} className="mt-4">
                Try Again
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Icon />}
        title={labelPlural}
        description={`Manage your ${labelPlural.toLowerCase()}`}
        action={{ label: "Create", onClick: handleCreateNew }}
      />

      {/* Filters */}
      <Card>
        <h2 className="text-lg font-semibold">Filters</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-50 max-w-sm">
            <Input
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              label="Search"
              variant="search"
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="h-9"
            >
              <X className="mr-2 h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      {/* Users Table */}
      {!isLoading && users.length === 0 ? (
        <EmptyState
          icon={<Icon />}
          title={`No ${labelPlural.toLowerCase()} found`}
          description={`Try adjusting your filters or add new ${labelPlural.toLowerCase()}`}
        />
      ) : !isLoading && (
        <>
          <Table
            pagination={{
              currentPage: meta.page,
              pageSize: meta.limit,
              totalItems: meta.total,
              totalPages: meta.totalPages,
              hasNextPage: meta.page < meta.totalPages,
              hasPreviousPage: meta.page > 1,
            }}
            onPageChange={setPage}
            onPageSizeChange={setLimit}
          >
            <TableHeader>
              <TableRow isHeader>
                <TableHead>{label}</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center justify-start">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isAdmin 
                          ? "bg-amber-100 border border-amber-200" 
                          : "bg-primary/10 border border-primary/20"
                      }`}>
                        {isAdmin ? (
                          <Shield className="w-5 h-5 text-amber-600" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{getCustomerFullName(user)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{user.email}</span>
                      {user.emailVerified && (
                        <Badge variant="success" className="text-xs">Verified</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "success" : "danger"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <IconButton
                        variant="view"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(user);
                        }}
                        title={`View ${label.toLowerCase()}`}
                      />
                      <IconButton
                        variant="edit"
                        href={`${basePath}/${user.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        title={`Edit ${label.toLowerCase()}`}
                      />
                      <IconButton
                        variant="delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(user);
                        }}
                        title={`Delete ${label.toLowerCase()}`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={`Delete ${label}`}
        message={`Are you sure you want to delete "${userToDelete ? getCustomerFullName(userToDelete) : ""}"? This action cannot be undone.`}
        itemName={userToDelete ? getCustomerFullName(userToDelete) : undefined}
        isLoading={deleteCustomer.isPending}
      />

      {/* User View Modal */}
      <UserViewModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setUserToView(null);
        }}
        customer={userToView}
        onEdit={handleViewEdit}
      />
    </div>
  );
};
