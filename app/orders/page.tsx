"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useSessionStoragePage } from "@/hooks/use-session-storage-page";
import { useLoading } from "../src/providers/loading-provider";
import {
  useOrders,
  useOrderAdminStats,
  useDeleteOrder,
} from "../src/services/orders/hooks/use-orders";
import type { Order, OrderStatus, OrderFilters } from "../src/services/orders/types/order.types";
import { PageHeader } from "../src/components/common/PageHeader";
import { Card } from "../src/components/ui/card";
import { Input } from "../src/components/ui/input";
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
import { Badge } from "../src/components/ui/badge";
import {
  Receipt,
  RefreshCw,
  Clock,
  PackageCheck,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { Button } from "../src/components/ui/button";
import { IconButton } from "../src/components/ui/icon-button";

function getOrderDate(dateString?: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? dateString : date.toLocaleString();
}

function getStatusColor(status: OrderStatus | string): "default" | "success" | "warning" | "danger" | "secondary" | "primary" {
  switch (status) {
    case "completed":
    case "delivered":
      return "success";
    case "pending":
      return "warning";
    case "cancelled":
    case "refunded":
      return "danger";
    default:
      return "default";
  }
}

const STATUS_FILTERS: Array<{ value: OrderStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

export default function OrdersPage() {
  const router = useRouter();
  const { setShowOverlay } = useLoading();

  const { page: storedPage, setPage: setStoredPage, limit: storedLimit, setLimit: setStoredLimit } = useSessionStoragePage("orders");
  const [queryParams, setQueryParams] = useState<OrderFilters>({
    page: storedPage,
    limit: storedLimit,
    search: "",
    status: "",
  });

  useEffect(() => {
    setStoredPage(queryParams.page ?? 1);
  }, [queryParams.page, setStoredPage]);

  useEffect(() => {
    if (queryParams.limit) setStoredLimit(queryParams.limit);
  }, [queryParams.limit, setStoredLimit]);

  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setQueryParams((prev) => ({ ...prev, search: searchTerm, page: 1 }));
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: response, isLoading, isError, error, refetch } = useOrders(queryParams);
  const orders = response?.data || [];
  const meta = response?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const { data: stats, refetch: refetchStats } = useOrderAdminStats({
    search: queryParams.search || undefined,
  });

  const deleteOrder = useDeleteOrder();
  const [orderPendingDelete, setOrderPendingDelete] = useState<Order | null>(null);

  const handleConfirmDelete = async () => {
    if (!orderPendingDelete) return;
    try {
      await deleteOrder.mutateAsync(orderPendingDelete.id);
      setOrderPendingDelete(null);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  const handlePageChange = (page: number) => {
    setQueryParams((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setQueryParams((prev) => ({ ...prev, limit: pageSize, page: 1 }));
  };

  const handleRefresh = () => {
    refetch();
    refetchStats();
  };

  const revenue = Number(stats?.revenue ?? 0);
  const profit = Number(stats?.profit ?? 0);
  const pendingCount = Number(stats?.pendingCount ?? 0);
  const deliveredCount = Number(stats?.deliveredCount ?? 0);

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Receipt />}
        title="Orders"
        description="View, create and manage customer orders"
        cancelAction={{
          label: "Refresh",
          onClick: handleRefresh,
        }}
        action={{
          label: "Create Order",
          onClick: () => router.push("/orders/create"),
        }}
      />

      {/* Snapshot — revenue/profit are all delivered orders across every page */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 w-full">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{meta.total}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-r1 text-primary">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{pendingCount}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-r1 text-yellow-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Delivered</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{deliveredCount}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-r1 text-green-600">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{revenue.toFixed(2)} JOD</p>
              <p className="text-xs text-gray-400 mt-0.5">Delivered orders</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-r1 text-blue-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Profit</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{profit.toFixed(2)} JOD</p>
              <p className="text-xs text-gray-400 mt-0.5">Price − cost</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-r1 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <Input
                label="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                isSearch
              />
            </div>
            <div className="flex items-end self-end">
              <Button variant="outline" onClick={handleRefresh} className="h-13">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => {
              const isActive = (queryParams.status || "") === filter.value;
              return (
                <button
                  key={filter.value || "all"}
                  type="button"
                  onClick={() => setQueryParams((prev) => ({ ...prev, status: filter.value as any, page: 1 }))}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    isActive
                      ? "bg-primary text-white border-primary"
                      : "border-primary/20 text-gray-600 hover:bg-primary/5"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {isError ? (
        <div>
          <EmptyState
            icon={<Receipt />}
            title="Failed to load orders"
            description={(error as any)?.message || "Please try again."}
          />
          <div className="flex justify-center mt-4">
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </div>
      ) : orders.length === 0 && !isLoading ? (
        <EmptyState
          icon={<Receipt />}
          title="No orders found"
          description="Try adjusting your filters or search criteria."
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table
            pagination={{
              currentPage: meta.page,
              totalPages: meta.totalPages,
              pageSize: meta.limit,
              totalItems: meta.total,
              hasNextPage: meta.page < meta.totalPages,
              hasPreviousPage: meta.page > 1,
            }}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          >
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead width="320px">Customer</TableHead>
                <TableHead>Shipping Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead width="180px">Date</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const itemsCount = Array.isArray(order.items) ? order.items.length : 0;
                const shipping = order.shippingAddress || (order as any).shipping || {};
                const isLoggedIn = Boolean(order.user);
                const customerLabel = isLoggedIn ? order.user!.email : "Guest";
                const shippingName = shipping.fullName?.trim() || "-";
                const shippingPhone = shipping.phone?.trim() || "-";
                return (
                  <TableRow
                    key={order.id}
                    className="hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    <TableCell className="font-mono font-medium">#{order.id}</TableCell>
                    <TableCell className="min-w-[180px] sm:min-w-[240px] lg:min-w-[320px] lg:w-[320px]">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase">
                          {customerLabel[0]?.toUpperCase() || "G"}
                        </div>
                        <p className="font-medium text-gray-900 whitespace-normal wrap-break-word">{customerLabel}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="truncate font-medium text-gray-900">{shippingName}</p>
                    </TableCell>
                    <TableCell>
                      <p className="truncate text-gray-700">{shippingPhone}</p>
                    </TableCell>
                    <TableCell>{itemsCount}</TableCell>
                    <TableCell className="font-semibold">{Number(order.totalAmount).toFixed(2)} JOD</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(order.status)}>
                        {(order.status || "Unknown").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[180px] w-[180px] whitespace-nowrap">{getOrderDate(order.created_at || order.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <IconButton href={`/orders/${order.id}`} variant="view" title="View Details" />
                        <IconButton href={`/orders/${order.id}/edit`} variant="edit" title="Edit Order" />
                        <IconButton
                          variant="delete"
                          title="Delete Order"
                          onClick={() => setOrderPendingDelete(order)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <DeleteConfirmationModal
        isOpen={!!orderPendingDelete}
        onClose={() => setOrderPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        isLoading={deleteOrder.isPending}
        title="Delete this order?"
        message="This will permanently delete the order and restore any reserved stock. This action cannot be undone."
        itemName={orderPendingDelete ? `Order #${orderPendingDelete.id}` : undefined}
      />
    </div>
  );
}
