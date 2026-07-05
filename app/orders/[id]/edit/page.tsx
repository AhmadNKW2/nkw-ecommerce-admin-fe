/**
 * Edit Order Page
 * Admin-facing single-page form for updating an existing order's
 * shipping/billing details, payment, status, notes and tracking number.
 */

"use client";

import React, { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/hooks/use-loading-router";
import { OrderForm } from "../../../src/components/orders/OrderForm";
import { useOrder, useUpdateOrder, useDeleteOrder } from "../../../src/services/orders/hooks/use-orders";
import { useLoading } from "../../../src/providers/loading-provider";
import { EmptyState } from "../../../src/components/common/EmptyState";
import { Button } from "../../../src/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function EditOrderPage() {
  const router = useRouter();
  const params = useParams();
  const { setShowOverlay } = useLoading();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();

  const id = useMemo(() => {
    const raw = (params as any)?.id;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [params]);

  const { data: order, isLoading, isError, error, refetch } = useOrder(id, {
    enabled: id > 0,
  });

  useEffect(() => {
    setShowOverlay(isLoading || updateOrder.isPending);
  }, [isLoading, updateOrder.isPending, setShowOverlay]);

  const handleSubmit = async ({ update }: { update: any }) => {
    await updateOrder.mutateAsync({ id, data: update });
    router.push(`/orders/${id}`);
  };

  const handleDelete = async () => {
    await deleteOrder.mutateAsync(id);
    router.push("/orders");
  };

  if (isError) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-5">
        <div className="w-full max-w-md">
          <EmptyState
            icon={<AlertCircle className="text-red-500 w-12 h-12" />}
            title="Failed to load order"
            description={(error as any)?.message || "Please try again."}
          />
          <div className="flex justify-center mt-6">
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <OrderForm
      isEditMode
      initialOrder={order}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      isDeleting={deleteOrder.isPending}
    />
  );
}
