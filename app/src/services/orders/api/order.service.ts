import { httpClient } from "../../../lib/api/http-client";
import type { ApiResponse } from "../../../types/common.types";
import type {
  AdminCreateOrderDto,
  CreateOrderDto,
  Order,
  OrderAdminStats,
  OrderFilters,
  OrderListResponse,
  OrderStatus,
  UpdateItemCostDto,
  UpdateOrderDto,
} from "../types/order.types";
import { objectToQueryParams } from "../../../lib/utils";

class OrderService {
  private endpoint = "/orders";

  // Updated to use Admin Endpoint for listing with filters
  listOrders(filters?: OrderFilters): Promise<OrderListResponse> {
    const query = objectToQueryParams(filters || {});
    // The previous implementation used ApiResponse<Order[]>, but the new requirement specifies a different structure
    // matching { data: Order[], meta: ... } directly or wrapped.
    // Assuming backend returns standard wrapper { success: true, data: { data: [], meta: {} } } or plain { data: [], meta: {} }
    // Based on user prompt: "Response: { data: [], meta: {} }"
    // If our http-client unwraps the response, we might need to adjust. 
    // Usually http-client returns the data payload.
    return httpClient.get<OrderListResponse>(`/orders/admin?${query}`);
  }

  getAdminStats(
    filters?: Pick<OrderFilters, "search" | "userId">
  ): Promise<ApiResponse<OrderAdminStats>> {
    const query = objectToQueryParams(filters || {});
    return httpClient.get<ApiResponse<OrderAdminStats>>(
      `/orders/admin/stats?${query}`
    );
  }

  getOrder(id: number): Promise<ApiResponse<Order>> {
    return httpClient.get<ApiResponse<Order>>(`${this.endpoint}/${id}`);
  }

  updateOrderStatus(id: number, status: OrderStatus): Promise<ApiResponse<Order>> {
    return httpClient.patch<ApiResponse<Order>>(`${this.endpoint}/${id}/status`, { status });
  }

  createOrder(data: CreateOrderDto): Promise<ApiResponse<Order>> {
    return httpClient.post<ApiResponse<Order>>(this.endpoint, data);
  }

  /** Admin-facing order creation: build an order for an existing customer or a guest. */
  createOrderAdmin(data: AdminCreateOrderDto): Promise<ApiResponse<Order>> {
    return httpClient.post<ApiResponse<Order>>(`${this.endpoint}/admin`, data);
  }

  /** Admin-facing general order edit (addresses, notes, tracking, payment, status). */
  updateOrder(id: number, data: UpdateOrderDto): Promise<ApiResponse<Order>> {
    return httpClient.patch<ApiResponse<Order>>(`${this.endpoint}/${id}`, data);
  }

  updateItemCosts(id: number, payload: UpdateItemCostDto): Promise<ApiResponse<Order>> {
    return httpClient.patch<ApiResponse<Order>>(`${this.endpoint}/${id}/items/cost`, payload);
  }

  /** Permanently delete an order (restores stock/wallet unless already cancelled/refunded). */
  deleteOrder(id: number): Promise<ApiResponse<{ success: boolean; id: number }>> {
    return httpClient.delete<ApiResponse<{ success: boolean; id: number }>>(`${this.endpoint}/${id}`);
  }
}

export const orderService = new OrderService();
