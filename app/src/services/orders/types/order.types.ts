export interface OrderItemInput {
  productId: number;
  quantity: number;
  variantId?: number;
}

export interface ShippingAddress {
  fullName?: string;
  phone?: string;
  street?: string;
  city?: string;
  country?: string;
  [key: string]: any;
}

export interface CreateOrderDto {
  items: OrderItemInput[];
  paymentMethod: string;
  shippingAddress: ShippingAddress;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

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

export interface Order {
  id: number;
  totalAmount: string;
  status: OrderStatus;
  user?: { email: string; [key: string]: any };
  items: OrderItem[];
  
  // Optional / Compatibility fields
  paymentMethod?: string;
  shippingAddress?: ShippingAddress;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  
  [key: string]: any;
}
