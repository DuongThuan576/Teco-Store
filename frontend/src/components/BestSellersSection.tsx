import React, { useState } from 'react';
import { Brand, Category, Product } from '../types/api';
import {
  formatVndPrice,
  getPrimaryVariant,
  getProductImage,
  getProductSpecChips,
  getTotalStock,
} from '../services/api';

interface BestSellersSectionProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  loading: boolean;
  error: string | null;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  selectedBrandId: string | null;
  onSelectBrand: (brandId: string | null) => void;
  searchQuery: string;
  onClearFilters: () => void;
  onSelectProduct: (product: Product) => void;
}

export const BestSellersSection: React.FC<BestSellersSectionProps> = ({
  products,
  categories,
  brands,
  loading,
  error,
  selectedCategoryId,
  onSelectCategory,
  selectedBrandId,
  onSelectBrand,
  searchQuery,
  onClearFilters,
  onSelectProduct,
}) => {
  const [showInactive, setShowInactive] = useState(false);

  const displayCategories = categories.filter((c) => c.productType !== 'test');

  const filteredProducts = products.filter((p) => {
    if (!showInactive && !p.isActive) return false;

    if (selectedCategoryId) {
      // Also match child categories if a parent category is selected
      const childCategoryIds = categories
        .filter((c) => c.parentId === selectedCategoryId)
        .map((c) => c._id);
      const validIds = [selectedCategoryId, ...childCategoryIds];
      if (!p.categoryId || !validIds.includes(p.categoryId)) {
        return false;
      }
    }

    if (selectedBrandId && p.brandId !== selectedBrandId) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchSlug = p.slug?.toLowerCase().includes(q);
      const matchSku = p.variants?.some((v) => v.sku?.toLowerCase().includes(q));
      if (!matchName && !matchSlug && !matchSku) return false;
    }

    return true;
  });

  const activeBrand = brands.find((b) => b._id === selectedBrandId);

  return (
    <section
      id="products-section"
      className="max-w-[1240px] mx-auto px-4 sm:px-margin-desktop py-space-lg"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-primary rounded-full" />
            <h2 className="text-headline-lg font-headline-lg text-text-primary">
              Sản phẩm nổi bật &amp; Bán chạy
            </h2>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar p-1 bg-white border border-border-subtle rounded-xl shadow-sm text-xs font-semibold">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              selectedCategoryId === null
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-primary hover:bg-surface-page'
            }`}
          >
            Tất cả
          </button>
          {displayCategories.map((cat) => (
            <button
              key={cat._id}
              type="button"
              onClick={() => onSelectCategory(cat._id)}
              className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategoryId === cat._id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-primary hover:bg-surface-page'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Active Filter Indicators */}
      {(selectedBrandId || searchQuery.trim() || selectedCategoryId) && (
        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
          <span className="text-text-secondary font-medium">Bộ lọc đang bật:</span>
          {selectedCategoryId && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-primary px-2.5 py-1 rounded-full font-semibold">
              Danh mục: {categories.find((c) => c._id === selectedCategoryId)?.name}
              <button
                type="button"
                onClick={() => onSelectCategory(null)}
                className="hover:text-red-600"
              >
                ×
              </button>
            </span>
          )}
          {activeBrand && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-primary px-2.5 py-1 rounded-full font-semibold">
              Thương hiệu: {activeBrand.name}
              <button
                type="button"
                onClick={() => onSelectBrand(null)}
                className="hover:text-red-600"
              >
                ×
              </button>
            </span>
          )}
          {searchQuery.trim() && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-primary px-2.5 py-1 rounded-full font-semibold">
              Từ khóa: &ldquo;{searchQuery}&rdquo;
            </span>
          )}
          <button
            type="button"
            onClick={onClearFilters}
            className="text-badge-discount hover:underline font-semibold ml-1"
          >
            Xóa tất cả bộ lọc
          </button>
        </div>
      )}

      {/* Loading / Error / Empty States */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-white border border-border-subtle rounded-xl p-3.5 animate-pulse h-80 flex flex-col justify-between"
            >
              <div className="aspect-square w-full rounded-lg bg-slate-200 mb-3" />
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-5 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border border-border-subtle rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-[40px] text-text-secondary">
            inventory_2
          </span>
          <p className="text-body-strong font-body-strong text-text-primary mt-2">
            Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại
          </p>
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-surface-tint transition-colors"
          >
            Xem tất cả sản phẩm có sẵn
          </button>
        </div>
      ) : (
        /* Product Grid: 4 across desktop */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filteredProducts.map((product, index) => {
            const primaryVariant = getPrimaryVariant(product);
            const totalStock = getTotalStock(product);
            const chips = getProductSpecChips(product);
            const imageUrl = getProductImage(product, index);
            const price = primaryVariant?.price;
            const brand = brands.find((b) => b._id === product.brandId);

            return (
              <div
                key={product._id}
                onClick={() => onSelectProduct(product)}
                className="bg-white border border-border-subtle rounded-xl p-3.5 hover:shadow-lg hover:border-primary/50 transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="relative aspect-square w-full rounded-lg bg-surface-page overflow-hidden mb-3 p-3 flex items-center justify-center">
                    {!product.isActive && (
                      <span className="absolute top-2 right-2 z-10 bg-slate-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        Ẩn / Test
                      </span>
                    )}
                    <img
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      alt={product.name}
                      src={imageUrl}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getProductImage(
                          { ...product, images: [] },
                          index,
                        );
                      }}
                    />
                  </div>

                  {/* Spec Chips */}
                  <div className="flex gap-1.5 mb-2 flex-wrap">
                    {brand && (
                      <span className="bg-blue-50 text-primary text-[11px] px-2 py-0.5 rounded font-semibold">
                        {brand.name}
                      </span>
                    )}
                    {chips.map((chip) => (
                      <span
                        key={chip}
                        className="bg-surface-page text-slate-700 text-[11px] px-2 py-0.5 rounded font-medium"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>

                  <h3 className="text-title-card font-title-card text-text-primary line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>

                  {product.variants?.length > 1 && (
                    <p className="text-[11px] text-text-secondary mt-1">
                      Có {product.variants.length} cấu hình (Màu sắc / Dung lượng)
                    </p>
                  )}
                </div>

                <div className="pt-3">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-price-lg font-price-lg text-badge-discount">
                      {formatVndPrice(price)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-text-secondary mt-2 pt-2 border-t border-border-subtle/60">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {product.variants?.length || 1} biến thể
                    </span>
                    {totalStock > 0 ? (
                      <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[13px]">
                          check_circle
                        </span>
                        Sẵn hàng 
                      </span>
                    ) : (
                      <span className="text-red-500 font-semibold text-[11px]">
                        Tạm hết hàng
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

