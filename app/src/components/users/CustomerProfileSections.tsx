"use client";

import Image from "next/image";
import {
  MapPin,
  ShoppingCart,
  Wallet,
  ArrowLeftRight,
  Package,
} from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { EmptyState } from "../common/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import type {
  CustomerAddress,
  CustomerCart,
  CustomerWallet,
  WalletTransaction,
} from "../../services/customers/types/customer.types";

function formatAddress(address: CustomerAddress) {
  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.country,
    address.zipCode,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatMoney(amount: number) {
  return `${Number(amount || 0).toFixed(2)} JOD`;
}

interface CustomerProfileSectionsProps {
  addresses?: CustomerAddress[];
  cart?: CustomerCart;
  wallet?: CustomerWallet;
  transactions?: WalletTransaction[];
}

export function CustomerProfileSections({
  addresses = [],
  cart,
  wallet,
  transactions = [],
}: CustomerProfileSectionsProps) {
  const cartItems = cart?.items ?? [];

  return (
    <>
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Saved Addresses ({addresses.length})</h2>
        </div>
        {addresses.length === 0 ? (
          <EmptyState
            icon={<MapPin />}
            title="No saved addresses"
            description="This customer has not saved any addresses yet."
          />
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-medium text-gray-900">{address.title}</span>
                  {address.isDefault ? <Badge variant="success">Default</Badge> : null}
                </div>
                <p className="text-sm leading-relaxed text-gray-600">{formatAddress(address)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Cart ({cartItems.length})</h2>
          </div>
          <span className="text-sm font-medium text-gray-700">
            Total: {formatMoney(cart?.total_amount ?? 0)}
          </span>
        </div>
        {cartItems.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart />}
            title="Cart is empty"
            description="This customer has no items in their cart."
          />
        ) : (
          <Table noPagination>
            <TableHeader>
              <TableRow isHeader>
                <TableHead>Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cartItems.map((item) => {
                const unitPrice =
                  item.product?.sale_price != null
                    ? Number(item.product.sale_price)
                    : Number(item.product?.price ?? 0);

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                        {item.product?.image ? (
                          <Image
                            src={item.product.image}
                            alt={item.product.name_en}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.product?.name_en || "Unknown"}</p>
                        {item.product?.name_ar ? (
                          <p className="text-sm text-gray-500" dir="rtl">
                            {item.product.name_ar}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatMoney(unitPrice * item.quantity)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Wallet & Cashback</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700">Wallet Balance</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">
              {formatMoney(wallet?.balance ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm text-amber-700">Total Cashback Earned</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">
              {formatMoney(wallet?.totalCashback ?? 0)}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Transactions ({transactions.length})</h2>
        </div>
        {transactions.length === 0 ? (
          <EmptyState
            icon={<ArrowLeftRight />}
            title="No transactions"
            description="This customer has no wallet transactions yet."
          />
        ) : (
          <Table noPagination>
            <TableHeader>
              <TableRow isHeader>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance After</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <Badge variant={transaction.type === "credit" ? "success" : "default"}>
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{transaction.source.replace(/_/g, " ")}</TableCell>
                  <TableCell>{formatMoney(transaction.amount)}</TableCell>
                  <TableCell>{formatMoney(transaction.balanceAfter)}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {transaction.description || transaction.referenceId || "—"}
                  </TableCell>
                  <TableCell>
                    {transaction.createdAt
                      ? new Date(transaction.createdAt).toLocaleString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
