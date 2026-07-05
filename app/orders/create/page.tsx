/**
 * Create Order Page
 * Admin-facing single-page form for building an order on behalf of a customer or guest.
 */

"use client";

import React from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { OrderForm } from "../../src/components/orders/OrderForm";
import { useCreateOrderAdmin } from "../../src/services/orders/hooks/use-orders";

export default function CreateOrderPage() {
  const router = useRouter();
  const createOrderAdmin = useCreateOrderAdmin();

  const handleSubmit = async ({ create }: { create: any }) => {
    const response = await createOrderAdmin.mutateAsync(create);
    const order = (response as any)?.data ?? response;
    router.push(order?.id ? `/orders/${order.id}` : "/orders");
  };

  return <OrderForm isEditMode={false} onSubmit={handleSubmit} />;
}
