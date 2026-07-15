"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "../../src/providers/loading-provider";
import { useOrder, useUpdateOrderStatus, useDeleteOrder } from "../../src/services/orders/hooks/use-orders";
import { Card } from "../../src/components/ui/card";
import { Button } from "../../src/components/ui/button";
import { EmptyState } from "../../src/components/common/EmptyState";
import { PageHeader } from "../../src/components/common/PageHeader";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../src/components/ui/table";
import { Badge } from "../../src/components/ui/badge";
import { OrderStatusPills } from "../../src/components/orders/OrderStatusPills";
import {
    Receipt,
    User,
    MapPin,
    CreditCard,
    Mail,
    Phone,
    CheckCircle2,
    Clock,
    AlertCircle,
    ShoppingBag,
    ImageOff,
    Trash2,
    Eye,
    Link2,
    UserCircle2,
} from "lucide-react";
import Image from "next/image";
import { OrderStatus } from "../../src/services/orders/types/order.types";
import { cn } from "../../src/lib/utils";
import { STOREFRONT_CONFIG } from "../../src/lib/constants";
import { DeleteConfirmationModal } from "../../src/components/common/DeleteConfirmationModal";

// --- Utility Components & Helpers ---

const formatCurrency = (amount: number | string) => {
    const val = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-JO', { style: 'currency', currency: 'JOD' }).format(val);
};

const formatOrderDateHeader = (dateString?: string) => {
    if (!dateString) return { date: "N/A", time: "" };
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return { date: "N/A", time: "" };
    return {
        date: date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        }),
        time: date.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
        }),
    };
};

const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const TIMELINE_META: Record<string, { label: string; dotColor: string; icon: React.ReactNode }> = {
    pending: { label: "Order Placed", dotColor: "bg-yellow-500 text-white", icon: <Clock /> },
    delivered: { label: "Delivered", dotColor: "bg-green-500 text-white", icon: <CheckCircle2 /> },
    completed: { label: "Completed", dotColor: "bg-green-500 text-white", icon: <CheckCircle2 /> },
    cancelled: { label: "Cancelled", dotColor: "bg-red-500 text-white", icon: <AlertCircle /> },
    refunded: { label: "Refunded", dotColor: "bg-gray-500 text-white", icon: <Receipt /> },
};

function getTimelineMeta(status: string) {
    return TIMELINE_META[status?.toLowerCase()] || { label: status || "Unknown", dotColor: "bg-gray-400 text-white", icon: <Clock /> };
}

function StatusBadge({ status }: { status: string }) {
    const statusMap: Record<string, "success" | "warning" | "danger" | "default" | "secondary" | "primary"> = {
        completed: "success",
        delivered: "success",
        pending: "warning",
        cancelled: "danger",
        refunded: "default",
    };

    const icons: Record<string, React.ReactNode> = {
        completed: <CheckCircle2 className="w-3 h-3 mr-1" />,
        delivered: <CheckCircle2 className="w-3 h-3 mr-1" />,
        pending: <Clock className="w-3 h-3 mr-1" />,
        cancelled: <AlertCircle className="w-3 h-3 mr-1" />,
        refunded: <Receipt className="w-3 h-3 mr-1" />,
    };

    const normalizedStatus = status?.toLowerCase() || "default";
    const variant = statusMap[normalizedStatus] || "default";

    return (
        <Badge variant={variant as any} className="flex items-center gap-1 w-fit capitalize">
            {icons[normalizedStatus]}
            {status}
        </Badge>
    );
}

// --- Main Page Component ---

export default function OrderDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const { setShowOverlay } = useLoading();
    const updateStatus = useUpdateOrderStatus();

    const [targetStatus, setTargetStatus] = useState<OrderStatus | "">("");
    const deleteOrder = useDeleteOrder();
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const id = useMemo(() => {
        const raw = (params as any)?.id;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : 0;
    }, [params]);

    const {
        data: order,
        isLoading,
        isError,
        error,
        refetch,
    } = useOrder(id, { enabled: id > 0 });

    useEffect(() => {
        setShowOverlay(isLoading || updateStatus.isPending || deleteOrder.isPending);
    }, [isLoading, updateStatus.isPending, deleteOrder.isPending, setShowOverlay]);

    useEffect(() => {
        if (order?.status) {
            setTargetStatus(order.status as OrderStatus);
        }
    }, [order]);

    const handleStatusUpdate = async () => {
        if (!targetStatus || !order) return;
        try {
            await updateStatus.mutateAsync({ id: order.id, status: targetStatus as OrderStatus });
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async () => {
        if (!order) return;
        try {
            await deleteOrder.mutateAsync(order.id);
            setShowDeleteModal(false);
            router.push("/orders");
        } catch (e) {
            console.error(e);
        }
    };

    if (isError) {
        return (
            <div className="admin-page">
                <PageHeader
                    icon={<Receipt />}
                    title="Order Details"
                    description="View order information"
                    cancelAction={{
                        label: "Back",
                        onClick: () => router.push("/orders"),
                    }}
                />
                <Card>
                    <EmptyState
                        icon={<AlertCircle className="text-red-500 w-12 h-12" />}
                        title="Failed to load order"
                        description={(error as any)?.message || "Please try again."}
                    />
                    <div className="flex justify-center gap-3">
                        <Button variant="outline" onClick={() => router.push("/orders")}>
                            Back to Orders
                        </Button>
                        <Button onClick={() => refetch()}>Try Again</Button>
                    </div>
                </Card>
            </div>
        );
    }

    if (!order && !isLoading) {
        return (
            <div className="admin-page">
                <PageHeader
                    icon={<Receipt />}
                    title="Order Details"
                    description="View order information"
                    cancelAction={{
                        label: "Back",
                        onClick: () => router.push("/orders"),
                    }}
                />
                <Card>
                    <EmptyState
                        icon={<Receipt />}
                        title="Order Not Found"
                        description="The order you are looking for does not exist or has been removed."
                    />
                    <div className="flex justify-center">
                        <Button onClick={() => router.push("/orders")}>
                            Back to Orders
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // Safe check for render
    if (!order) return null;

    const items = Array.isArray(order.items) ? order.items : [];
    const shipping = order.shippingAddress || (order as any).shipping || {};
    const easyPurchaseStreetPlaceholders = new Set([
      "cash on delivery",
      "not provided",
      "address not collected",
    ]);
    const shippingStreet = String(shipping.street || "").trim();
    const hasRealStreet =
      Boolean(shippingStreet) &&
      !easyPurchaseStreetPlaceholders.has(shippingStreet.toLowerCase());
    const user = (order.user || {}) as any;
    const isGuest = !order.user;

    const userFullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    const customerName = userFullName || user.name || shipping.fullName || "Guest Customer";
    const customerEmail = user.email || shipping.email || null;
    const customerPhone = user.phone || shipping.phone || null;
    const customerInitial = (customerName || "C").trim()[0]?.toUpperCase() || "C";

    const totalAmount = parseFloat(order.totalAmount || "0");
    const subtotalAmount = order.subtotalAmount != null ? parseFloat(String(order.subtotalAmount)) : totalAmount;
    const shippingAmount = order.shippingAmount != null ? parseFloat(String(order.shippingAmount)) : 0;
    const discountAmount = order.discountAmount != null ? parseFloat(String(order.discountAmount)) : 0;

    // Newest first. Falls back to created/updated timestamps if history hasn't been recorded yet.
    const timelineEntries = Array.isArray(order.statusHistory) && order.statusHistory.length > 0
        ? [...order.statusHistory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [
            { id: -1, status: order.status, note: undefined, createdAt: order.updated_at || order.created_at },
            ...(order.created_at && order.created_at !== order.updated_at
                ? [{ id: -2, status: "pending", note: "Order placed", createdAt: order.created_at }]
                : []),
        ];

    const canSaveStatus = targetStatus && targetStatus !== order.status;

    const orderCreatedAt = order.created_at || order.createdAt;
    const { date: orderDateLabel, time: orderTimeLabel } = formatOrderDateHeader(orderCreatedAt);
    const shippingUnitLine = [
        shipping.building && `Bldg ${shipping.building}`,
        shipping.floor && `Floor ${shipping.floor}`,
        shipping.apartment && `Apt ${shipping.apartment}`,
    ].filter(Boolean).join(" · ");

    const orderHeaderDescription = orderTimeLabel
        ? `${orderDateLabel} · ${orderTimeLabel}`
        : orderDateLabel;

    return (
        <div className="admin-page">
            <PageHeader
                icon={<Receipt />}
                title={
                    <span className="flex items-center gap-2">
                        Order #{order.id}
                        <StatusBadge status={order.status} />
                    </span>
                }
                description={orderHeaderDescription}
                cancelAction={{
                    label: "Back",
                    onClick: () => router.push("/orders"),
                }}
                extraActions={
                    <Button
                        variant="outline"
                        color="var(--color-danger)"
                        onClick={() => setShowDeleteModal(true)}
                    >
                        <span className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </span>
                    </Button>
                }
                action={{
                    label: "Edit Order",
                    onClick: () => router.push(`/orders/${order.id}/edit`),
                }}
            />

            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                isLoading={deleteOrder.isPending}
                title="Delete this order?"
                message="This will permanently delete the order and restore any reserved stock. This action cannot be undone."
                itemName={`Order #${order.id}`}
            />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full">
                    {/* Left Column (Main) */}
                    <div className="lg:col-span-2 flex flex-col gap-5">
                        {/* Order Items */}
                        <Card>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5 text-gray-500" />
                                    Order Items
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    List of products in this order
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <Table noPagination={true}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px]">Product</TableHead>
                                            <TableHead>Details</TableHead>
                                            <TableHead>Vendor</TableHead>
                                            <TableHead className="text-center w-[90px]">Links</TableHead>
                                            <TableHead className="text-right">Cost</TableHead>
                                            <TableHead className="text-right">Unit Price</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item) => {
                                            const productName = item.product?.name_en || item.product?.name_ar || "Unknown Product";
                                            const productImage = item.product?.image || (item.product?.media_groups && Object.values(item.product.media_groups)[0]?.media?.[0]?.url) || null;
                                            const itemPrice = parseFloat(String(item.price));
                                            const itemCost = parseFloat(String(item.cost ?? 0));
                                            const itemTotal = itemPrice * item.quantity;
                                            const variantParams = item.variant?.attribute_values || {};
                                            const vendorName =
                                                item.vendor?.name_en ||
                                                (item.vendorId != null ? `Vendor #${item.vendorId}` : "—");

                                            return (
                                                <TableRow key={item.id} className="group hover:bg-gray-50/50">
                                                    <TableCell className="align-top py-4">
                                                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border bg-gray-50 shadow-sm group-hover:shadow-md transition-shadow">
                                                            {productImage ? (
                                                                <Image
                                                                    src={productImage}
                                                                    alt={productName}
                                                                    fill
                                                                    className="object-cover"
                                                                    unoptimized
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                    <ImageOff className="w-5 h-5" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="align-top py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-semibold text-gray-900 group-hover:text-primary transition-colors">{productName}</span>
                                                            <span className="text-xs font-mono text-gray-400">SKU: {item.product?.sku || "N/A"}</span>
                                                            {Object.keys(variantParams).length > 0 && (
                                                                <div className="flex flex-wrap gap-2 mt-1">
                                                                    {Object.entries(variantParams).map(([key, val]) => (
                                                                        <div key={key} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-gray-700 bg-gray-50">
                                                                            <span className="opacity-60 mr-1 capitalize">{key}:</span> {String(val)}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="align-top py-4 text-sm text-gray-700">
                                                        {vendorName}
                                                    </TableCell>
                                                    <TableCell className="align-top py-4">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            {item.product?.slug ? (
                                                                <a
                                                                    href={`${STOREFRONT_CONFIG.baseUrl}/products/${item.product.slug}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    title="View product on website"
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </a>
                                                            ) : (
                                                                <span
                                                                    title="No storefront page"
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 text-gray-300"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </span>
                                                            )}
                                                            {item.product?.reference_link ? (
                                                                <a
                                                                    href={item.product.reference_link}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    title="Open reference link"
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                                                >
                                                                    <Link2 className="w-4 h-4" />
                                                                </a>
                                                            ) : (
                                                                <span
                                                                    title="No reference link"
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 text-gray-300"
                                                                >
                                                                    <Link2 className="w-4 h-4" />
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right align-top py-4 font-mono text-gray-600">
                                                        {formatCurrency(itemCost)}
                                                    </TableCell>
                                                    <TableCell className="text-right align-top py-4 font-mono text-gray-600">
                                                        {formatCurrency(itemPrice)}
                                                    </TableCell>
                                                    <TableCell className="text-right align-top py-4 font-mono text-gray-900 font-medium">
                                                        x{item.quantity}
                                                    </TableCell>
                                                    <TableCell className="text-right align-top py-4 font-mono font-bold text-gray-900">
                                                        {formatCurrency(itemTotal)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="bg-primary/5 p-5 flex flex-col items-end gap-2">
                                <div className="w-full max-w-xs space-y-2">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(subtotalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Shipping</span>
                                        <span>{formatCurrency(shippingAmount)}</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between text-sm text-green-600">
                                            <span>Discount</span>
                                            <span>-{formatCurrency(discountAmount)}</span>
                                        </div>
                                    )}
                                    <div className="my-2 h-px bg-gray-200" />
                                    <div className="flex justify-between text-lg font-bold text-gray-900">
                                        <span>Total</span>
                                        <span>{formatCurrency(totalAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Timeline */}
                        <Card>
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-gray-500" />
                                Order Timeline
                            </h3>
                            {timelineEntries.length === 0 ? (
                                <p className="text-sm text-gray-400 py-2">No history available for this order yet.</p>
                            ) : (
                                <div className="relative border-l border-gray-200 ml-3 space-y-7 pl-6 py-2">
                                    {timelineEntries.map((entry, idx) => {
                                        const meta = getTimelineMeta(entry.status);
                                        const isLatest = idx === 0;
                                        return (
                                            <div key={entry.id ?? `${entry.status}-${entry.createdAt}`} className="relative">
                                                <span
                                                    className={cn(
                                                        "absolute -left-[31px] top-0.5 h-6 w-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm",
                                                        isLatest ? meta.dotColor : "bg-gray-200 text-gray-500"
                                                    )}
                                                >
                                                    <span className="[&>svg]:w-3 [&>svg]:h-3">{meta.icon}</span>
                                                </span>
                                                <div className="flex flex-col">
                                                    <span className={cn("text-sm font-semibold", isLatest ? "text-gray-900" : "text-gray-700")}>
                                                        {meta.label}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{formatDate(entry.createdAt)}</span>
                                                    {entry.note && (
                                                        <span className="text-xs text-gray-400 mt-0.5 italic">{entry.note}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Right Column (Sidebar) */}
                    <div className="flex flex-col gap-5">

                        {/* Status Management */}
                        <Card>
                            <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">
                                Order Status
                            </h3>
                            <OrderStatusPills
                                label={null}
                                value={targetStatus}
                                onChange={(val) => setTargetStatus(val)}
                                disabled={updateStatus.isPending}
                            />
                            <Button
                                className="w-full"
                                onClick={handleStatusUpdate}
                                disabled={!canSaveStatus || updateStatus.isPending}
                            >
                                Update
                            </Button>
                        </Card>

                        {/* Customer Details */}
                        <Card>
                            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                Customer Details
                            </h3>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="w-11 h-11 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold border border-primary/20">
                                    {customerInitial}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-semibold text-gray-900 truncate leading-snug">{customerName}</p>
                                    <p className="text-xs text-gray-500 flex flex-wrap items-center gap-1.5">
                                        {isGuest ? (
                                            <span className="inline-flex items-center gap-1 text-orange-600">
                                                <UserCircle2 className="w-3 h-3" /> Guest checkout
                                            </span>
                                        ) : (
                                            <span>Customer ID: {user.id || "N/A"}</span>
                                        )}
                                        {order.clientId != null ? (
                                            <span className="inline-flex items-center gap-1 font-semibold text-primary">
                                                · Client #{order.clientId}
                                            </span>
                                        ) : order.browserKey ? (
                                            <span
                                              className="inline-flex items-center gap-1 font-mono text-gray-500"
                                              title={order.browserKey}
                                            >
                                                · {order.browserKey.slice(0, 8)}…
                                            </span>
                                        ) : null}
                                        {order.isAdminClient ? (
                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                                Admin device
                                            </span>
                                        ) : null}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-3 pt-2">
                                <div className="flex items-start gap-3">
                                    <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                                    <div className="text-sm overflow-hidden text-ellipsis w-full">
                                        <span className="block text-xs text-gray-500 mb-0.5">Email</span>
                                        {customerEmail ? (
                                            <a href={`mailto:${customerEmail}`} className="text-blue-600 hover:underline block truncate">
                                                {customerEmail}
                                            </a>
                                        ) : (
                                            <span className="text-gray-400 block truncate">N/A</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                                    <div className="text-sm w-full">
                                        <span className="block text-xs text-gray-500 mb-0.5">Phone</span>
                                        {customerPhone ? (
                                            <a href={`tel:${customerPhone}`} className="text-blue-600 hover:underline block truncate">
                                                {customerPhone}
                                            </a>
                                        ) : (
                                            <span className="text-gray-400 block truncate">N/A</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 mt-4 border-t border-gray-100">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" />
                                    Shipping Information
                                </h4>
                                <div className="flex flex-col gap-2.5 text-sm">
                                    {(shipping.fullName || customerName) && (
                                        <p className="font-semibold text-gray-900">
                                            {shipping.fullName || customerName}
                                        </p>
                                    )}
                                    {hasRealStreet ? (
                                        <p className="text-gray-700">{shippingStreet}</p>
                                    ) : (
                                        <p className="text-gray-400 italic">Street not collected (easy purchase)</p>
                                    )}
                                    {shippingUnitLine && (
                                        <p className="text-gray-500">{shippingUnitLine}</p>
                                    )}
                                    {shipping.city && <p className="text-gray-700">{shipping.city}</p>}
                                    {shipping.country && (
                                        <p className="font-medium text-gray-900">{shipping.country}</p>
                                    )}
                                    {!hasRealStreet && !shipping.city && !shipping.country && (
                                        <p className="text-gray-400 italic">No shipping address provided</p>
                                    )}
                                    {(shipping.notes || shipping.details) && (
                                        <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                                            Note: {shipping.notes || shipping.details}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* Extra Info */}
                        <Card>
                            <div >
                                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-gray-500" />
                                    Payment Information
                                </h3>
                            </div>
                            <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-gray-500">Method</span>
                                    <span className="font-medium text-gray-900">{order.paymentMethod || "Cash On Delivery"}</span>
                                </div>
                            </div>
                        </Card>

                    </div>
                </div>
        </div>
    );
}
