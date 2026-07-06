"use client";

import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Vendor } from "../../services/vendors/types/vendor.types";
import { Building2, Calendar } from "lucide-react";

interface VendorViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: Vendor | null;
  onEdit: () => void;
}

export const VendorViewModal: React.FC<VendorViewModalProps> = ({
  isOpen,
  onClose,
  vendor,
  onEdit,
}) => {
  if (!vendor) return null;

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-md">
      <div className="w-full space-y-6">
        {/* Title */}
        <h2 className="text-2xl font-bold">Vendor Details</h2>

        {/* Header with Logo */}
        <div className="flex items-start gap-4">
          {vendor.logo ? (
            <img
              src={vendor.logo}
              alt={vendor.name_en}
              className="w-20 h-20 rounded-lg object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{vendor.name_en}</h3>
            <p className="text-sm text-gray-500">{vendor.name_ar}</p>
            <div className="mt-2">
              <Badge variant={vendor.visible ? "success" : "danger"}>
                {vendor.visible ? "Visible" : "Hidden"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Description */}
        {(vendor.description_en || vendor.description_ar) && (
          <div className="space-y-3">
            {vendor.description_en && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Description (English)</p>
                <p className="text-gray-900">{vendor.description_en}</p>
              </div>
            )}
            {vendor.description_ar && (
              <div className="bg-gray-50 rounded-lg p-4" dir="rtl">
                <p className="text-sm text-gray-500 mb-1">Description (Arabic)</p>
                <p className="text-gray-900">{vendor.description_ar}</p>
              </div>
            )}
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">ID</p>
            <p className="font-semibold">{vendor.id}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Sort Order</p>
            <p className="font-semibold">{vendor.sort_order ?? "N/A"}</p>
          </div>
        </div>

        {/* Timestamps */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Calendar className="w-4 h-4" />
            <span>Created: {formatDate(vendor.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Updated: {formatDate(vendor.updated_at)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onEdit}>Edit Vendor</Button>
        </div>
      </div>
    </Modal>
  );
};
