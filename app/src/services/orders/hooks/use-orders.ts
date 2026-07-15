import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import { showSuccessToast } from "../../../lib/toast";
import { orderService } from "../api/order.service";
import type {
  AdminCreateOrderDto,
  CreateOrderDto,
  OrderFilters,
  OrderStatus,
  UpdateItemCostDto,
  UpdateOrderDto,
} from "../types/order.types";

export const useOrders = (filters?: OrderFilters) => {
  return useQuery({
    // Must stay under queryKeys.orders.all so SSE + mutations can invalidate with ["orders"].
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => orderService.listOrders(filters),
  });
};

export const useOrderAdminStats = (
  filters?: Pick<OrderFilters, "search" | "userId">
) => {
  return useQuery({
    queryKey: queryKeys.orders.stats(filters),
    queryFn: () => orderService.getAdminStats(filters),
    select: (response) => response.data,
  });
};

export const useOrder = (id: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => orderService.getOrder(id),
    select: (response) => response.data,
    enabled: options?.enabled ?? !!id,
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) => 
      orderService.updateOrderStatus(id, status),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) });
      showSuccessToast("Order status updated successfully");
    },
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrderDto) => orderService.createOrder(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      showSuccessToast("Order created successfully");
    },
  });
};

export const useCreateOrderAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AdminCreateOrderDto) => orderService.createOrderAdmin(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      showSuccessToast("Order created successfully");
    },
  });
};

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateOrderDto }) =>
      orderService.updateOrder(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) });
      showSuccessToast("Order updated successfully");
    },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => orderService.deleteOrder(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.removeQueries({ queryKey: queryKeys.orders.detail(id) });
      showSuccessToast("Order deleted successfully");
    },
  });
};

export const useUpdateOrderItemCosts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateItemCostDto }) =>
      orderService.updateItemCosts(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) });
      showSuccessToast("Item costs updated successfully");
    },
  });
};
