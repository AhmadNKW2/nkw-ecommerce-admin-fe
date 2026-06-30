"use client";

import Image from "next/image";
import { Package, Star } from "lucide-react";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import type { PaginationData } from "../ui/pagination";
import {
  ProductItem,
  formatProductCategoryName,
  formatProductRating,
  getProductCategoryName,
  getProductDisplayPrice,
  getProductImageUrl,
  getProductStockSummary,
} from "./product-table-utils";
import { useResolvedFeatureToggles } from "../../hooks/use-resolved-feature-toggles";

interface ProductCatalogTableProps {
  products: ProductItem[];
  pagination?: PaginationData;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  selectable?: boolean;
  selectedProductIds?: number[];
  onToggleProduct?: (productId: number) => void;
  onToggleAll?: (currentPageIds: number[], allSelected: boolean) => void;
  noPagination?: boolean;
  tableClassName?: string;
}

export const ProductCatalogTable: React.FC<ProductCatalogTableProps> = ({
  products,
  pagination,
  onPageChange,
  onPageSizeChange,
  selectable = false,
  selectedProductIds = [],
  onToggleProduct,
  onToggleAll,
  noPagination = false,
  tableClassName = "min-w-280",
}) => {
  const { isEnabled } = useResolvedFeatureToggles();
  const vendorsEnabled = isEnabled("vendors_enabled");
  const ratingsEnabled = isEnabled("ratings_enabled");
  const selectedIdSet = new Set(selectedProductIds);
  const currentPageIds = products.map((product) => product.id);
  const allCurrentPageSelected =
    selectable && currentPageIds.length > 0 && currentPageIds.every((id) => selectedIdSet.has(id));

  const getVisibilityVariant = (visible?: boolean) => {
    return visible ? "success" : "danger";
  };

  const getVisibilityLabel = (visible?: boolean) => {
    return visible ? "Visible" : "Hidden";
  };

  return (
    <Table
      className={tableClassName}
      pagination={pagination}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      noPagination={noPagination}
    >
      <TableHeader>
        <TableRow isHeader>
          {selectable ? (
            <TableHead width="4%">
              <Checkbox
                checked={allCurrentPageSelected}
                onChange={() => onToggleAll?.(currentPageIds, allCurrentPageSelected)}
              />
            </TableHead>
          ) : null}
          <TableHead width="4%">#</TableHead>
          <TableHead width="6%">Image</TableHead>
          <TableHead width="18%">Product Name</TableHead>
          <TableHead width="10%">Category</TableHead>
          <TableHead width="13%">Brand</TableHead>
          {vendorsEnabled && <TableHead width="13%">Vendor</TableHead>}
          <TableHead width="8%">Price</TableHead>
          <TableHead width="9%">Stock</TableHead>
          {ratingsEnabled && <TableHead width="7%">Rating</TableHead>}
          <TableHead width="8%">Visibility</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const imageUrl = getProductImageUrl(product);
          const displayPrice = getProductDisplayPrice(product);
          const stockSummary = getProductStockSummary(product);
          const categoryName = getProductCategoryName(product);
          const isSelected = selectedIdSet.has(product.id);

          return (
            <TableRow
              key={product.id}
              className={`transition-colors ${
                selectable
                  ? isSelected
                    ? "bg-primary/5"
                    : "hover:bg-gray-50"
                  : "hover:bg-gray-50"
              }`}
              onClick={selectable && onToggleProduct ? () => onToggleProduct(product.id) : undefined}
            >
              {selectable ? (
                <TableCell>
                  <div onClick={(event: React.MouseEvent) => event.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => onToggleProduct?.(product.id)}
                    />
                  </div>
                </TableCell>
              ) : null}
              <TableCell className="font-mono text-sm">{product.id}</TableCell>
              <TableCell>
                <div className="w-15 h-15 relative rounded-lg overflow-hidden bg-primary/10 border border-primary/20">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={product.name_en || ""}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="max-w-xs">
                <div className="flex flex-col">
                  <span className="truncate" title={product.name_en}>
                    {product.name_en}
                  </span>
                  <span className="text-sm text-gray-500 truncate" title={product.name_ar}>
                    {product.name_ar}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {categoryName ? (
                  <span title={categoryName} className="block max-w-22.5">
                    <Badge
                      variant="default2"
                      className="block w-full overflow-hidden text-ellipsis whitespace-nowrap"
                    >
                      {formatProductCategoryName(categoryName)}
                    </Badge>
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </TableCell>
              <TableCell>
                {product.brand?.name_en || product.brand?.logo ? (
                  <div className="flex items-center gap-2">
                    {product.brand?.logo ? (
                      <div className="w-15 h-15 relative overflow-hidden border border-primary/20 rounded-lg">
                        <Image
                          src={product.brand.logo}
                          alt={product.brand.name_en || ""}
                          fill
                          className="object-contain"
                        />
                      </div>
                    ) : null}
                    <span className="text-sm">
                      {product.brand?.name_en || <span className="text-gray-400">—</span>}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </TableCell>
              {vendorsEnabled && (
              <TableCell>
                <div className="flex items-center gap-2">
                  {product.vendor?.logo ? (
                    <div className="w-15 h-15 relative overflow-hidden border border-primary/20 rounded-lg">
                      <Image
                        src={product.vendor.logo}
                        alt={product.vendor.name_en || product.vendor.name || ""}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : null}
                  <span className="text-sm">
                    {product.vendor?.name_en || product.vendor?.name || (
                      <span className="text-gray-400">—</span>
                    )}
                  </span>
                </div>
              </TableCell>
              )}
              <TableCell>
                {!displayPrice ? (
                  <span className="text-gray-400">—</span>
                ) : (
                  <div className="flex flex-col">
                    <span className="font-semibold">{displayPrice.currentPrice}</span>
                    {displayPrice.compareAtPrice ? (
                      <span className="text-xs text-gray-500 line-through">
                        {displayPrice.compareAtPrice}
                      </span>
                    ) : null}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={stockSummary.inStock ? "success" : "danger"}>
                  {stockSummary.label}
                </Badge>
              </TableCell>
              {ratingsEnabled && (
              <TableCell>
                <div className="flex items-center justify-start gap-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold">{formatProductRating(product.average_rating)}</span>
                  {product.total_ratings ? (
                    <span className="text-xs text-gray-500">({product.total_ratings})</span>
                  ) : null}
                </div>
              </TableCell>
              )}
              <TableCell>
                <Badge variant={getVisibilityVariant(product.visible ?? product.is_active)}>
                  {getVisibilityLabel(product.visible ?? product.is_active)}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};