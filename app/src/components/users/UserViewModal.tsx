"use client";

import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Customer, CustomerWithWishlist, getCustomerFullName, WishlistItem } from "../../services/customers/types/customer.types";
import { User as UserIcon, Calendar, Mail, Phone, Shield, ShoppingBag, Package } from "lucide-react";

interface UserViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | CustomerWithWishlist | null;
  onEdit: () => void;
}

export const UserViewModal: React.FC<UserViewModalProps> = ({
  isOpen,
  onClose,
  customer,
  onEdit,
}) => {
  if (!customer) return null;

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fullName = getCustomerFullName(customer);
  const wishlist = (customer as CustomerWithWishlist).wishlist;
  const isAdminRole = customer.role === "admin" || customer.role === "constant_token_admin";

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-lg">
      <div className="w-full space-y-6">
        {/* Title */}
        <h2 className="text-2xl font-bold">User Details</h2>

        {/* Header with Avatar */}
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <UserIcon className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{fullName}</h3>
            <p className="text-sm text-gray-500">{customer.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant={customer.isActive ? "success" : "danger"}>
                {customer.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant={isAdminRole ? "warning" : "default"}>
                {isAdminRole ? "Admin" : "User"}
              </Badge>
              {customer.emailVerified && (
                <Badge variant="success">
                  <Shield className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-500">Email</p>
            </div>
            <p className="text-gray-900 font-medium">{customer.email}</p>
          </div>
          
          {customer.phone && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="w-4 h-4 text-gray-400" />
                <p className="text-sm text-gray-500">Phone</p>
              </div>
              <p className="text-gray-900 font-medium">{customer.phone}</p>
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">User ID</p>
            <p className="font-semibold">{customer.id}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Email Verified</p>
            <p className="font-semibold">{customer.emailVerified ? "Yes" : "No"}</p>
          </div>
        </div>

        {/* Wishlist Section */}
        {wishlist && wishlist.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <h4 className="font-semibold">Wishlist ({wishlist.length} items)</h4>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {wishlist.slice(0, 5).map((item: WishlistItem) => (
                <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  {item.product.media?.[0]?.url ? (
                    <img
                      src={item.product.media[0].url}
                      alt={item.product.name_en}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product.name_en}</p>
                    <p className="text-xs text-gray-500">SKU: {item.product.sku}</p>
                  </div>
                </div>
              ))}
              {wishlist.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  +{wishlist.length - 5} more items
                </p>
              )}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Calendar className="w-4 h-4" />
            <span>Joined: {formatDate(customer.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Updated: {formatDate(customer.updatedAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onEdit}>Edit User</Button>
        </div>
      </div>
    </Modal>
  );
};
