/**
 * Order Form — single-page form used for both creating and editing orders.
 * Mirrors the visual language of ProductForm (stacked Cards + PageHeader actions).
 */

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/hooks/use-loading-router";
import {
  Package,
  Plus,
  Minus,
  Trash2,
  User,
  MapPin,
  CreditCard,
  ShoppingBag,
  ImageOff,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "../common/PageHeader";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Select, type SelectOption } from "../ui/select";
import { Button } from "../ui/button";
import { OrderStatusPills } from "./OrderStatusPills";
import { EmptyState } from "../common/EmptyState";
import { DeleteConfirmationModal } from "../common/DeleteConfirmationModal";
import { useProducts } from "../../services/products/hooks/use-products";
import { useCustomers } from "../../services/customers/hooks/use-customers";
import { getCustomerFullName } from "../../services/customers/types/customer.types";
import { getProductImageUrl } from "../common/product-table-utils";
import { useSeoSettings } from "../../services/settings/hooks/use-settings";
import { useVendors } from "../../services/vendors/hooks/use-vendors";
import type { Product } from "../../services/products/types/product.types";
import type {
  AdminCreateOrderDto,
  CodCollectionStatus,
  Order,
  OrderStatus,
  PaymentMethod,
  ShippingAddress,
  UpdateOrderDto,
} from "../../services/orders/types/order.types";
import { showErrorToast } from "../../lib/toast";
import { coalesceNumber, type NullableNumber } from "../../lib/nullable-number";
import { CodCollectionPills } from "./CodCollectionPills";

export interface OrderFormItem {
  key: string;
  itemId?: number;
  productId: number;
  name: string;
  sku?: string;
  image?: string | null;
  quantity: number;
  price: NullableNumber;
  cost: NullableNumber;
  vendorId: number | null;
  maxQuantity?: number;
}

function resolveProductVendorId(product: Product): number | null {
  const nestedVendorId = (product as { vendor?: { id?: number | string | null } }).vendor?.id;
  const raw =
    product.vendor_id ??
    (product as { vendorId?: number | string | null }).vendorId ??
    nestedVendorId;
  if (raw == null || raw === "") return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function formatVendorLabel(vendor: {
  name_en?: string;
  name_ar?: string;
  name?: string;
}): string {
  return vendor.name_en || vendor.name || "Unknown vendor";
}

interface OrderFormSubmitPayload {
  create: AdminCreateOrderDto;
  update: UpdateOrderDto;
}

interface OrderFormProps {
  isEditMode?: boolean;
  initialOrder?: Order;
  onSubmit: (payload: OrderFormSubmitPayload) => Promise<void>;
  onDelete?: () => Promise<void>;
  isDeleting?: boolean;
}

const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { value: "cod", label: "Cash on Delivery" },
  { value: "card", label: "Card" },
  { value: "wallet", label: "Wallet" },
];

function getEffectivePrice(product: Product): number {
  const salePrice = Number(product.sale_price ?? 0);
  const price = Number(Array.isArray(product.price) ? 0 : product.price ?? 0);
  return salePrice > 0 ? salePrice : price;
}

function formatMoney(value: NullableNumber): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

/** Mirrors the backend's `calculateOrderShippingAmount` so the create-order
 * form defaults to the same delivery fee configured in Settings. */
function resolveDefaultShippingFee(
  subtotalAmount: number,
  settings?: { delivery_fee?: number; free_delivery_enabled?: boolean; free_delivery_amount?: number }
): number {
  if (!settings) return 0;
  const freeDeliveryEnabled = settings.free_delivery_enabled !== false;
  const freeDeliveryAmount = settings.free_delivery_amount ?? 50;
  if (freeDeliveryEnabled && subtotalAmount >= freeDeliveryAmount) {
    return 0;
  }
  return Number(settings.delivery_fee ?? 2);
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const EMPTY_ADDRESS: ShippingAddress = {
  fullName: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  country: "Jordan",
  building: "",
  floor: "",
  apartment: "",
  notes: "",
};

/** Storefront easy-purchase checkout fills street with this placeholder when address isn't collected. */
const EASY_PURCHASE_STREET_PLACEHOLDERS = new Set([
  "cash on delivery",
  "not provided",
  "address not collected",
]);

function normalizeShippingAddress(raw?: ShippingAddress | null): ShippingAddress {
  const merged = { ...EMPTY_ADDRESS, ...(raw || {}) };
  const street = (merged.street || "").trim();
  if (EASY_PURCHASE_STREET_PLACEHOLDERS.has(street.toLowerCase())) {
    merged.street = "";
  }
  return merged;
}

export const OrderForm: React.FC<OrderFormProps> = ({
  isEditMode = false,
  initialOrder,
  onSubmit,
  onDelete,
  isDeleting = false,
}) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    await onDelete();
    setShowDeleteModal(false);
  };

  // --- Customer -------------------------------------------------------
  const [customerMode, setCustomerMode] = useState<"guest" | "existing">(
    initialOrder?.user?.id ? "existing" : "guest"
  );
  const [customerId, setCustomerId] = useState<number | null>(
    (initialOrder?.user as any)?.id ?? null
  );
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState<string>(
    initialOrder?.user
      ? `${(initialOrder.user as any).firstName ?? ""} ${(initialOrder.user as any).lastName ?? ""}`.trim() ||
          (initialOrder.user as any).email
      : ""
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 350);
  const { data: customersResponse, isLoading: customersLoading } = useCustomers({
    search: debouncedCustomerSearch || undefined,
    limit: 20,
  });
  const customerOptions: SelectOption[] = useMemo(() => {
    const list = customersResponse?.data || [];
    const options = list.map((c) => ({
      value: String(c.id),
      label: `${getCustomerFullName(c)} — ${c.email}`,
    }));
    if (
      customerId &&
      selectedCustomerLabel &&
      !options.some((o) => o.value === String(customerId))
    ) {
      options.unshift({ value: String(customerId), label: selectedCustomerLabel });
    }
    return options;
  }, [customersResponse, customerId, selectedCustomerLabel]);

  // --- Items ------------------------------------------------------------
  const [items, setItems] = useState<OrderFormItem[]>(() => {
    if (!initialOrder?.items) return [];
    return initialOrder.items.map((item) => {
      const product = item.product;
      const image =
        (product as any)?.image ||
        (product?.media_groups
          ? Object.values(product.media_groups)[0]?.media?.[0]?.url
          : undefined) ||
        null;
      return {
        key: String(item.id),
        itemId: item.id,
        productId: item.productId ?? product?.id ?? 0,
        name: product?.name_en || product?.name_ar || `Product #${item.productId}`,
        sku: (product as any)?.sku,
        image,
        quantity: item.quantity,
        price: item.price != null ? Number(item.price) : null,
        cost: item.cost != null ? Number(item.cost) : null,
        vendorId:
          item.vendorId != null
            ? Number(item.vendorId)
            : item.vendor?.id != null
              ? Number(item.vendor.id)
              : null,
      };
    });
  });

  const [productSearch, setProductSearch] = useState("");
  const debouncedProductSearch = useDebouncedValue(productSearch, 350);
  const { data: productsResponse, isLoading: productsLoading } = useProducts({
    search: debouncedProductSearch || undefined,
    limit: 20,
  });
  const productResults = productsResponse?.data?.data || [];
  const productOptions: SelectOption[] = useMemo(
    () =>
      productResults.map((p) => ({
        value: String(p.id),
        label: `${p.name_en}${p.sku ? ` · ${p.sku}` : ""} — ${formatMoney(getEffectivePrice(p))} JOD`,
        image: getProductImageUrl(p) || null,
      })),
    [productResults]
  );

  const { data: vendorsResponse } = useVendors({ limit: 200 });
  const vendorOptions: SelectOption[] = useMemo(() => {
    const list = vendorsResponse?.data || [];
    const options = list.map((vendor) => ({
      value: String(vendor.id),
      label: formatVendorLabel(vendor),
    }));

    // Keep currently selected vendors visible even if they fall outside the fetched page.
    for (const item of items) {
      if (
        item.vendorId != null &&
        !options.some((o) => o.value === String(item.vendorId))
      ) {
        const fromOrder = initialOrder?.items?.find(
          (oi) =>
            oi.id === item.itemId ||
            Number(oi.vendorId) === item.vendorId ||
            oi.vendor?.id === item.vendorId
        )?.vendor;
        options.unshift({
          value: String(item.vendorId),
          label: fromOrder
            ? formatVendorLabel(fromOrder)
            : `Vendor #${item.vendorId}`,
        });
      }
    }

    return options;
  }, [vendorsResponse, items, initialOrder]);

  const handleAddProduct = (productIdStr: string) => {
    const product = productResults.find((p) => String(p.id) === productIdStr);
    if (!product) return;

    const productVendorId = resolveProductVendorId(product);

    setItems((prev) => {
      const existing = prev.find(
        (it) => it.key === `${product.id}-base` || it.productId === product.id
      );
      if (existing) {
        return prev.map((it) =>
          it.key === existing.key
            ? {
                ...it,
                quantity: it.quantity + 1,
                // Keep/refresh vendor from the product when still unset.
                vendorId: it.vendorId ?? productVendorId,
              }
            : it
        );
      }
      const image = getProductImageUrl(product) || null;
      return [
        ...prev,
        {
          key: `${product.id}-base`,
          productId: product.id,
          name: product.name_en,
          sku: product.sku,
          image,
          quantity: 1,
          price: getEffectivePrice(product),
          cost: product.cost != null ? Number(product.cost) : null,
          vendorId: productVendorId,
          maxQuantity: product.quantity ?? undefined,
        },
      ];
    });
  };

  const updateItem = (key: string, patch: Partial<OrderFormItem>) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  };

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + coalesceNumber(it.price) * it.quantity, 0),
    [items]
  );

  // --- Shipping address ---------------------------------------------------
  const [address, setAddress] = useState<ShippingAddress>(() =>
    normalizeShippingAddress(initialOrder?.shippingAddress)
  );

  const updateAddress = (field: keyof ShippingAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  // Auto-fill address contact fields when picking an existing customer.
  const handleSelectCustomer = (value: string) => {
    const id = Number(value);
    setCustomerId(id);
    const found = customersResponse?.data?.find((c) => c.id === id);
    if (found) {
      setSelectedCustomerLabel(`${getCustomerFullName(found)} — ${found.email}`);
      setAddress((prev) => ({
        ...prev,
        fullName: prev.fullName || getCustomerFullName(found),
        email: prev.email || found.email,
        phone: prev.phone || found.phone || "",
      }));
    }
  };

  // --- Payment / status / fees --------------------------------------------
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    (initialOrder?.paymentMethod as PaymentMethod) || "cod"
  );
  const [codCollectionStatus, setCodCollectionStatus] = useState<CodCollectionStatus>(
    initialOrder?.codCollectionStatus === "received" ? "received" : "pending"
  );
  const [status, setStatus] = useState<OrderStatus>(
    (initialOrder?.status as OrderStatus) || "pending"
  );
  const { data: seoSettings } = useSeoSettings();
  const [shippingAmount, setShippingAmount] = useState<NullableNumber>(
    initialOrder?.shippingAmount != null ? Number(initialOrder.shippingAmount) : null
  );
  const [shippingTouched, setShippingTouched] = useState(false);

  // Default the shipping fee to the store's configured delivery fee (Settings)
  // when creating a new order, until the admin manually overrides it.
  useEffect(() => {
    if (isEditMode || shippingTouched || !seoSettings) return;
    setShippingAmount(resolveDefaultShippingFee(subtotal, seoSettings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, shippingTouched, seoSettings, subtotal]);
  const toDateInputValue = (raw?: string | null): string => {
    const date = raw ? new Date(raw) : new Date();
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  };

  const [orderDate, setOrderDate] = useState<string>(
    toDateInputValue(initialOrder?.createdAt || initialOrder?.created_at)
  );

  const shippingAmountNum = coalesceNumber(shippingAmount);
  // Admin create/edit no longer edits discounts; keep any existing value on edit.
  const discountAmountNum = isEditMode
    ? Number(initialOrder?.discountAmount ?? 0)
    : 0;
  const total = Math.max(0, subtotal + shippingAmountNum - discountAmountNum);
  const walletAppliedAmount = Number(initialOrder?.walletAppliedAmount ?? 0);
  const codAmountDuePreview = Math.max(0, total - walletAppliedAmount);
  const showCodCollection = paymentMethod === "cod" && codAmountDuePreview > 0;

  const validate = (): string | null => {
    if (items.length === 0) return "Add at least one product to the order.";
    if (!address.fullName?.trim()) return "Customer full name is required.";
    if (!address.phone?.trim()) return "Phone number is required.";
    if (customerMode === "existing" && !customerId)
      return "Select a registered customer, or switch to guest checkout.";
    return null;
  };

  const resolveAddressForSubmit = (): ShippingAddress => ({
    ...address,
    // API requires street; easy-purchase orders may leave it blank in admin.
    street: address.street?.trim() || "Not provided",
    // API requires city; form no longer collects it — keep existing or placeholder.
    city: address.city?.trim() || "Not provided",
    country: address.country?.trim() || "Jordan",
  });

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      showErrorToast(error);
      return;
    }

    setIsSubmitting(true);
    try {
      const shippingAddress = resolveAddressForSubmit();
      if (isEditMode) {
        const payload: UpdateOrderDto = {
          shippingAddress,
          billingAddress: shippingAddress,
          paymentMethod,
          status,
          orderDate: orderDate || undefined,
          shippingAmount: shippingAmountNum,
          discountAmount: discountAmountNum,
          ...(showCodCollection
            ? { codCollectionStatus }
            : {}),
          items: items.map((it) => ({
            ...(it.itemId != null ? { itemId: it.itemId } : {}),
            productId: it.productId,
            quantity: it.quantity,
            price: it.price ?? undefined,
            cost: it.cost ?? undefined,
            vendorId: it.vendorId ?? undefined,
          })),
        };
        await onSubmit({ update: payload, create: {} as AdminCreateOrderDto });
      } else {
        const payload: AdminCreateOrderDto = {
          userId: customerMode === "existing" ? customerId ?? undefined : undefined,
          items: items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            price: it.price ?? undefined,
            cost: it.cost ?? undefined,
            vendorId: it.vendorId ?? undefined,
          })),
          shippingAddress,
          billingAddress: shippingAddress,
          paymentMethod,
          status,
          shippingAmount: shippingAmountNum,
          discountAmount: discountAmountNum,
          orderDate: orderDate || undefined,
        };
        await onSubmit({ create: payload, update: {} });
      }
    } catch (err) {
      console.error("Failed to submit order form:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Package />}
        title={
          isEditMode ? (
            <span className="flex items-center gap-2">
              Edit Order
              {initialOrder && <span className="text-primary">#{initialOrder.id}</span>}
            </span>
          ) : (
            "Create New Order"
          )
        }
        description={
          isEditMode
            ? "Update products, shipping and payment details"
            : "Build an order on behalf of a customer"
        }
        cancelAction={{
          label: "Cancel",
          onClick: () => router.push(isEditMode && initialOrder ? `/orders/${initialOrder.id}` : "/orders"),
          disabled: isSubmitting,
        }}
        action={{
          label: isSubmitting ? "Saving..." : isEditMode ? "Save Changes" : "Create Order",
          onClick: handleSubmit,
          disabled: isSubmitting,
        }}
        extraActions={
          isEditMode && onDelete ? (
            <Button
              variant="outline"
              color="var(--color-danger)"
              onClick={() => setShowDeleteModal(true)}
              disabled={isSubmitting || isDeleting}
            >
              <span className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Delete Order
              </span>
            </Button>
          ) : undefined
        }
      />

      {onDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
          title="Delete this order?"
          message="This will permanently delete the order and restore any reserved stock. This action cannot be undone."
          itemName={initialOrder ? `Order #${initialOrder.id}` : undefined}
        />
      )}

      {/* Customer */}
      {!isEditMode && (
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              Customer
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCustomerMode("guest")}
                className={`inline-flex items-center gap-1.5 rounded-r1 border px-3 py-2 text-sm font-medium transition-colors ${
                  customerMode === "guest"
                    ? "bg-primary text-white border-primary"
                    : "border-primary/20 text-gray-600 hover:bg-primary/5"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Guest
              </button>
              <button
                type="button"
                onClick={() => setCustomerMode("existing")}
                className={`inline-flex items-center gap-1.5 rounded-r1 border px-3 py-2 text-sm font-medium transition-colors ${
                  customerMode === "existing"
                    ? "bg-primary text-white border-primary"
                    : "border-primary/20 text-gray-600 hover:bg-primary/5"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Registered Customer
              </button>
            </div>
          </div>

          {customerMode === "existing" ? (
            <Select
              label="Search customer by name or email"
              options={customerOptions}
              value={customerId ? String(customerId) : ""}
              onChange={(val) => handleSelectCustomer(val as string)}
              onSearchChange={setCustomerSearch}
              placeholder={customersLoading ? "Loading..." : "Search customers..."}
            />
          ) : (
            <p className="text-sm text-gray-500">
              This order will be created without a linked account. Fill in the shipping
              details below with the customer&apos;s contact information.
            </p>
          )}
        </Card>
      )}

      {/* Items */}
      <Card>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-gray-500" />
            Order Items
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {isEditMode
              ? "Add, remove, or adjust products, vendor, cost and unit price"
              : "Search and add products to this order"}
          </p>
        </div>

        <Select
          label="Search products by name or SKU"
          options={productOptions}
          value=""
          onChange={(val) => handleAddProduct(val as string)}
          onSearchChange={setProductSearch}
          placeholder={productsLoading ? "Loading..." : "Search products to add..."}
        />

        {items.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag />}
            title="No items yet"
            description="Use the search box above to add products to this order."
          />
        ) : (
          <div className="flex flex-col divide-y divide-gray-100 border border-gray-100 rounded-r1 overflow-visible">
            {items.map((item) => (
              <div
                key={item.key}
                className="flex flex-wrap md:flex-nowrap items-end gap-4 p-4 bg-white hover:bg-gray-50/50 transition-colors overflow-visible"
              >
                <div className="relative w-14 h-14 rounded-r1 overflow-hidden border bg-gray-50 shrink-0">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageOff className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 self-center">
                  <p className="font-medium text-gray-900 truncate">{item.name}</p>
                  {item.sku && (
                    <p className="text-xs font-mono text-gray-400">SKU: {item.sku}</p>
                  )}
                </div>

                <div className="w-44 shrink-0">
                  <Select
                    label="Vendor"
                    value={item.vendorId != null ? String(item.vendorId) : ""}
                    onChange={(value) => {
                      const selected = Array.isArray(value) ? value[0] ?? "" : value;
                      updateItem(item.key, {
                        vendorId: selected ? Number(selected) : null,
                      });
                    }}
                    options={vendorOptions}
                    search={true}
                    placeholder="Select vendor"
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0 pb-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateItem(item.key, { quantity: Math.max(1, item.quantity - 1) })
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-r1 border border-primary/20 hover:bg-primary/5 text-gray-600"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.key, {
                        quantity: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="w-14 text-center border border-primary/20 rounded-r1 py-1.5 focus:outline-none focus:border-secondary"
                  />
                  <button
                    type="button"
                    onClick={() => updateItem(item.key, { quantity: item.quantity + 1 })}
                    className="w-8 h-8 flex items-center justify-center rounded-r1 border border-primary/20 hover:bg-primary/5 text-gray-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="w-24 shrink-0">
                  <Input
                    label="Cost"
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.cost}
                    onNumberChange={(value) => updateItem(item.key, { cost: value })}
                    className="text-left"
                    dir="ltr"
                  />
                </div>

                <div className="w-24 shrink-0">
                  <Input
                    label="Price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.price}
                    onNumberChange={(value) => updateItem(item.key, { price: value })}
                    className="text-left"
                    dir="ltr"
                  />
                </div>

                <div className="w-24 text-right font-semibold text-gray-900 shrink-0 pb-2.5">
                  {formatMoney(item.price != null ? item.price * item.quantity : null)} JOD
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-danger hover:bg-danger/10 shrink-0 mb-1"
                  title="Remove item"
                  disabled={items.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900">{formatMoney(subtotal)} JOD</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Order Summary */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-gray-500" />
          Order Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Order Date"
            type="date"
            lang="en-GB"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
          />
          <Select
            label="Payment Method"
            options={PAYMENT_METHOD_OPTIONS}
            value={paymentMethod}
            onChange={(val) => {
              const next = val as PaymentMethod;
              setPaymentMethod(next);
              if (next === "cod" && !codCollectionStatus) {
                setCodCollectionStatus("pending");
              }
            }}
            search={false}
          />
          <Input
            label="Shipping Fee (JOD)"
            type="number"
            min={0}
            step="0.01"
            value={shippingAmount}
            onNumberChange={(value) => {
              setShippingTouched(true);
              setShippingAmount(value);
            }}
            dir="ltr"
            className="text-left"
          />
        </div>

        {showCodCollection ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-r1 border border-amber-200 bg-amber-50/60 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                Shipping cash
              </span>
              <span className="text-sm font-bold text-gray-900 tabular-nums">
                {formatMoney(codAmountDuePreview)} JOD
              </span>
            </div>
            <CodCollectionPills
              value={isEditMode ? codCollectionStatus : "pending"}
              onChange={setCodCollectionStatus}
              disabled={!isEditMode}
              label={null}
            />
          </div>
        ) : null}

        <OrderStatusPills
          value={status}
          onChange={setStatus}
        />

        <div className="bg-primary/5 -mx-5 -mb-5 mt-2 p-5 rounded-b-r1 flex flex-col items-end gap-2">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)} JOD</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Shipping</span>
              <span>{formatMoney(shippingAmountNum)} JOD</span>
            </div>
            <div className="my-2 h-px bg-gray-200" />
            <div className="flex justify-between text-lg font-bold text-gray-900">
              <span>Total</span>
              <span>{formatMoney(total)} JOD</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Shipping Address */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-500" />
          Shipping Address
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Full Name"
            value={address.fullName || ""}
            onChange={(e) => updateAddress("fullName", e.target.value)}
          />
          <Input
            label="Phone"
            value={address.phone || ""}
            onChange={(e) => updateAddress("phone", e.target.value)}
          />
          <Input
            label="Email"
            value={address.email || ""}
            onChange={(e) => updateAddress("email", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Input
            label="Street Address"
            value={address.street || ""}
            onChange={(e) => updateAddress("street", e.target.value)}
          />
          {!address.street?.trim() && (
            <p className="text-xs text-gray-400">
              Easy-purchase orders may not have a street address collected at checkout.
            </p>
          )}
        </div>
      </Card>

    </div>
  );
};
