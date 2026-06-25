
import React from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Receipt } from "lucide-react";
import type { Order } from "../../services/orders/types/order.types";
import { Card } from "../ui/card";
import { EmptyState } from "../common/EmptyState";

interface OrdersTableSectionProps {
  orders: Order[];
  title?: string;
  className?: string;
}

export const OrdersTableSection: React.FC<OrdersTableSectionProps> = ({
  orders,
  title = "Customer Orders",
  className,
}) => {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <span className="text-sm text-gray-400">
            {orders.length} orders found
        </span>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Receipt />}
          title="No orders yet"
          description="This customer hasn't placed any orders yet."
        />
      ) : (
        <Table noPagination={true}>
          <TableHeader>
            <TableRow isHeader>
              <TableHead>Order ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
                const itemsCount = Array.isArray(order.items)
                  ? order.items.length
                  : Array.isArray((order as any).orderItems)
                    ? (order as any).orderItems.length
                    : 0;

                const total =
                  typeof order.total === "number"
                    ? order.total
                    : typeof order.totalAmount === "number"
                      ? order.totalAmount
                      : typeof order.totalAmount === "string"
                        ? Number(order.totalAmount)
                        : 0;
                
                const createdDate = order.createdAt || order.created_at;

              return (
                <TableRow key={order.id}>
                  <TableCell className="font-mono">#{order.id}</TableCell>
                  <TableCell>
                    <Badge variant={(order.status === "delivered" || order.status === "shipped") ? "success" : "default"}>
                      {order.status || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>{order.paymentMethod || "-"}</TableCell>
                  <TableCell>{typeof total === "number" && !Number.isNaN(total) ? `${total.toFixed(2)} JOD` : "-"}</TableCell>
                  <TableCell>{itemsCount}</TableCell>
                  <TableCell>
                    {createdDate ? new Date(createdDate).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell>
                    <Link href={`/orders/${order.id}`}>
                        <Button variant="outline" className="h-8 px-3 text-xs">
                            View
                        </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
};
