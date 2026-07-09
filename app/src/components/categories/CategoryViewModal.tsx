"use client";

import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Category } from "../../services/categories/types/category.types";
import { Folder, Calendar } from "lucide-react";
import { Card } from "../ui";

interface CategoryViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  onEdit: () => void;
  parentCategory?: Category | null;
}

export const CategoryViewModal: React.FC<CategoryViewModalProps> = ({
  isOpen,
  onClose,
  category,
  onEdit,
  parentCategory,
}) => {
  if (!category) return null;

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
      <div className="w-full flex flex-col gap-5">
        {/* Title */}
        <h2 className="text-2xl font-bold text-center">Category Details</h2>

        {/* Header with Image */}
        <div className="flex items-center gap-4">
          {category.image ? (
            <img
              src={category.image}
              alt={category.name_en}
              className="w-20 h-20 rounded-lg object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center">
              <Folder className="w-8 h-8 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{category.name_en}</h3>
            <p className="text-sm text-gray-500">{category.name_ar}</p>
          </div>
          <Badge variant={category.visible ? "success" : "danger"}>
            {category.visible ? "Visible" : "Hidden"}
          </Badge>

        </div>

        {/* Details Grid */}
        <Card noFlex variant="nested" className="flex justify-between items-center">
          <p className="text-sm text-gray-500">ID</p>
          <p className="font-semibold">{category.id}</p>
        </Card>
        <Card noFlex variant="nested" className="flex justify-between items-center">
          <p className="text-sm text-gray-500">Parent Category</p>
          <p className="font-semibold">
            {parentCategory ? parentCategory.name_en : "None (Root Category)"}
          </p>
        </Card>

        <Card noFlex variant="nested" className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">Tags (English)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {category.tags_en?.length ? (
                category.tags_en.map((tag, index) => (
                  <Badge key={`en-${index}-${tag}`} variant="default">
                    {tag}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-gray-400">No English tags</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500">Tags (Arabic)</p>
            <div className="mt-2 flex flex-wrap gap-2" dir="rtl">
              {category.tags_ar?.length ? (
                category.tags_ar.map((tag, index) => (
                  <Badge key={`ar-${index}-${tag}`} variant="default2">
                    {tag}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-gray-400">No Arabic tags</p>
              )}
            </div>
          </div>
        </Card>

        {/* Timestamps */}
        <Card noFlex variant="nested" className="flex justify-between items-center">
          <Calendar className="w-4 h-4" />
          <span>Created: {formatDate(category.createdAt)}</span>
        </Card>
        <Card noFlex variant="nested" className="flex justify-between items-center">
          <Calendar className="w-4 h-4" />
          <span>Updated: {formatDate(category.updatedAt)}</span>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button color="var(--color-primary2)" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onEdit}>Edit Category</Button>
        </div>
      </div>
    </Modal>
  );
};
