export interface OrderItemInput {
  productId: number;
  quantity: number;
  variantId?: number;
}

export interface ShippingAddress {
  fullName?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  country?: string;
  building?: string;
  floor?: string;
  apartment?: string;
  notes?: string;
  [key: string]: any;
}

export interface CreateOrderDto {
  items: OrderItemInput[];
  paymentMethod: string;
  shippingAddress: ShippingAddress;
}

export type OrderStatus = 'pending' | 'delivered' | 'cancelled' | 'refunded';

export type PaymentMethod = 'card' | 'cod' | 'wallet';

/** A single line item used when an admin creates an order manually. */
export interface AdminOrderItemInput {
  productId: number;
  quantity: number;
  variantId?: number;
  /** Optional price override; defaults to the product's current sale/list price. */
  price?: number;
  cost?: number;
}

/** Payload for POST /orders/admin — lets an admin build an order for an existing customer or a guest. */
export interface AdminCreateOrderDto {
  userId?: number | null;
  items: AdminOrderItemInput[];
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  paymentMethod: PaymentMethod;
  status?: OrderStatus;
  shippingAmount?: number;
  discountAmount?: number;
  notes?: string;
  trackingNumber?: string;
  orderDate?: string;
}

/** A single line item update when editing an existing order. */
export interface UpdateOrderItemEntry {
  itemId: number;
  price?: number;
  cost?: number;
}

/** Payload for PATCH /orders/:id — general admin edits to an existing order. */
export interface UpdateOrderDto {
  shippingAddress?: ShippingAddress;
  billingAddress?: ShippingAddress;
  paymentMethod?: PaymentMethod;
  status?: OrderStatus;
  notes?: string;
  trackingNumber?: string;
  orderDate?: string;
  items?: UpdateOrderItemEntry[];
  shippingAmount?: number;
  discountAmount?: number;
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  status?: OrderStatus | '';
  search?: string;
  userId?: number;
}

export interface OrderMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrderListResponse {
  data: Order[];
  meta: OrderMeta;
}

export interface ItemProduct {
    id: number;
    name_en: string;
    name_ar: string;
    slug: string;
    sku?: string;
    reference_link?: string | null;
    image?: string; // Assuming maybe provided, else we handle it
    media_groups?: Record<string, { media: any[] }>; // Fallback
}

export interface ItemVariant {
    id: number;
    attribute_values?: Record<string, any>; 
}

export interface OrderItem {
  id: number;
  productId?: number;
  variantId?: number;
  quantity: number;
  price: string | number;
  cost?: string | number;
  product?: ItemProduct;
  variant?: ItemVariant;
  
  // Backward compat (if needed)
  [key: string]: any;
}

export interface UpdateItemCostEntry {
  itemId: number;
  cost: number;
}

export interface UpdateItemCostDto {
  items: UpdateItemCostEntry[];
}

export interface OrderStatusHistoryEntry {
  id: number;
  orderId: number;
  status: OrderStatus;
  note?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface Order {
  id: number;
  totalAmount: string;
  status: OrderStatus;
  user?: { email: string; [key: string]: any };
  items: OrderItem[];
  statusHistory?: OrderStatusHistoryEntry[];
  
  // Optional / Compatibility fields
  paymentMethod?: string;
  shippingAddress?: ShippingAddress;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  
  [key: string]: any;
}
