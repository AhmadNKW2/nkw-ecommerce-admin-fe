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

/** Cash remittance from the shipping company for COD orders. */
export type CodCollectionStatus = 'pending' | 'received';

export type CodCollectionFilter = 'owed' | 'received' | 'cod';

/** A single line item used when an admin creates an order manually. */
export interface AdminOrderItemInput {
  productId: number;
  quantity: number;
  variantId?: number;
  /** Optional price override; defaults to the product's current sale/list price. */
  price?: number;
  cost?: number;
  /** Optional vendor override; defaults to the product's vendor. */
  vendorId?: number;
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
  /** Existing line id. Omit when adding a new product. */
  itemId?: number;
  productId?: number;
  quantity?: number;
  price?: number;
  cost?: number;
  vendorId?: number;
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
  /** Shipping-company remittance status for COD cash. */
  codCollectionStatus?: CodCollectionStatus;
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  status?: OrderStatus | '';
  search?: string;
  userId?: number;
  codCollectionStatus?: CodCollectionStatus | '';
  /** owed = still want money; received = taken from shipping; cod = any COD */
  codCollection?: CodCollectionFilter | '';
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

/** Aggregate stats for the admin orders dashboard (all pages). */
export interface OrderAdminStats {
  pendingCount: number;
  deliveredCount: number;
  cancelledCount: number;
  refundedCount: number;
  /** Σ(price × quantity) for delivered orders only. */
  revenue: number;
  /** Σ((price − cost) × quantity) for delivered orders only. */
  profit: number;
  /** COD orders where shipping still owes cash. */
  codOwedCount: number;
  codOwedAmount: number;
  /** COD orders already remitted by shipping. */
  codReceivedCount: number;
  codReceivedAmount: number;
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

export interface OrderItemVendor {
  id: number;
  name_en?: string;
  name_ar?: string;
}

export interface OrderItem {
  id: number;
  productId?: number;
  variantId?: number;
  vendorId?: number | null;
  quantity: number;
  price: string | number;
  cost?: string | number;
  product?: ItemProduct;
  variant?: ItemVariant;
  vendor?: OrderItemVendor | null;

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
  walletAppliedAmount?: string | number;
  shippingAddress?: ShippingAddress;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  /** Analytics browser key from storefront. */
  browserKey?: string | null;
  /** Sequential Client # from analytics_visitors when known. */
  clientId?: number | null;
  /** True when browserKey is registered as an admin device (even for guest checkout). */
  isAdminClient?: boolean;
  /** Shipping-company remittance status for COD cash. */
  codCollectionStatus?: CodCollectionStatus | null;
  /** Cash amount shipping company owes for this order. */
  codAmountDue?: string | number;
  /** When cash was marked received from shipping. */
  codCollectedAt?: string | null;
  
  [key: string]: any;
}
