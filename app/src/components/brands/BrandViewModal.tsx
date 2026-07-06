"use client";

import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Brand } from "../../services/brands/types/brand.types";
import { Tags, Calendar } from "lucide-react";

interface BrandViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: Brand | null;
  onEdit: () => void;
}

export const BrandViewModal: React.FC<BrandViewModalProps> = ({
  isOpen,
  onClose,
  brand,
  onEdit,
}) => {
  if (!brand) return null;

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
        <h2 className="text-2xl font-bold">Brand Details</h2>

        <div className="flex items-start gap-4">
          {brand.logo ? (
            <img
              src={brand.logo}
              alt={brand.name_en}
              className="w-20 h-20 rounded-lg object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center">
              <Tags className="w-8 h-8 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{brand.name_en}</h3>
            <p className="text-sm text-gray-500">{brand.name_ar}</p>
            <div className="mt-2">
              <Badge variant={brand.visible ? "success" : "danger"}>
                {brand.visible ? "Visible" : "Hidden"}
              </Badge>
            </div>
          </div>
        </div>

        {(brand.description_en || brand.description_ar) && (
          <div className="space-y-3">
            {brand.description_en && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Description (English)</p>
                <p className="text-gray-900">{brand.description_en}</p>
              </div>
            )}
            {brand.description_ar && (
              <div className="bg-gray-50 rounded-lg p-4" dir="rtl">
                <p className="text-sm text-gray-500 mb-1">Description (Arabic)</p>
                <p className="text-gray-900">{brand.description_ar}</p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">ID</p>
            <p className="font-semibold">{brand.id}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Sort Order</p>
            <p className="font-semibold">{brand.sort_order ?? "N/A"}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Calendar className="w-4 h-4" />
            <span>Created: {formatDate(brand.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Updated: {formatDate(brand.updated_at)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onEdit}>Edit Brand</Button>
        </div>
      </div>
    </Modal>
  );
};
