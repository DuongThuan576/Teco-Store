import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  onAddToCart?: (product: Product, isBuyNow?: boolean) => void;
  compareIds?: string[];
  onToggleCompare?: (product: Product) => void;
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
  onAddToCart,
  compareIds = [],
  onToggleCompare,
}) => {
  const navigate = useNavigate();
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

  // Giới hạn 12 sản phẩm nổi bật trên trang chủ để tránh làm loãng trang
  const DISPLAY_LIMIT = 12;
  const displayedProducts = filteredProducts.slice(0, DISPLAY_LIMIT);

  const activeBrand = brands.find((b) => b._id === selectedBrandId);

  return (
    <section
      id="products-section"
      className="max-w-[1240px] mx-auto px-4 sm:px-margin-desktop py-space-lg"
    >
      <div className="flex flex-col items-start mb-4 gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-6 bg-primary rounded-full shrink-0" />
          <h2 className="text-headline-lg font-headline-lg text-text-primary">
            Sản phẩm nổi bật &amp; Bán chạy
          </h2>
        </div>

        {/* Tab Buttons */}
        <div className="w-full flex items-center space-x-1.5 overflow-x-auto thin-scrollbar px-2 pt-2 pb-1 bg-white border border-border-subtle rounded-xl shadow-sm text-xs font-semibold">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className={`h-8 px-3.5 rounded-lg inline-flex items-center justify-center leading-none whitespace-nowrap transition-colors cursor-pointer ${
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
              className={`h-8 px-3.5 rounded-lg inline-flex items-center justify-center leading-none whitespace-nowrap transition-colors cursor-pointer ${
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
        <>
          {/* Product Grid: 4 across desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayedProducts.map((product, index) => {
            const primaryVariant = getPrimaryVariant(product);
            const totalStock = getTotalStock(product);
            const chips = getProductSpecChips(product);
            const imageUrl = getProductImage(product, index);
            const price = primaryVariant?.price;
            const brand = brands.find((b) => b._id === product.brandId);
            const isCompared = compareIds.includes(product._id);

            return (
              <div
                key={product._id}
                onClick={() => onSelectProduct(product)}
                className="bg-white border border-border-subtle rounded-xl p-3.5 hover:shadow-lg hover:border-primary/50 transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="relative aspect-square w-full rounded-lg bg-surface-page overflow-hidden mb-3 p-3 flex items-center justify-center">
                    {onToggleCompare && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCompare(product);
                        }}
                        className={`absolute top-2 left-2 z-10 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                          isCompared
                            ? 'bg-primary text-white'
                            : 'bg-white/90 hover:bg-primary hover:text-white text-slate-700 border border-border-subtle'
                        }`}
                        title="Thêm vào bảng so sánh sản phẩm"
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          compare_arrows
                        </span>
                        <span>{isCompared ? 'Đã chọn' : 'So sánh'}</span>
                      </button>
                    )}
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

                <div className="pt-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-price-lg font-price-lg text-badge-discount">
                      {formatVndPrice(price)}
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

                  {onAddToCart && (
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-border-subtle/60">
                      <button
                        type="button"
                        disabled={totalStock <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(product, true);
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-badge-discount hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-2xs disabled:opacity-40"
                      >
                        <span>Mua ngay</span>
                      </button>
                      <button
                        type="button"
                        disabled={totalStock <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(product, false);
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-white border border-primary text-primary hover:bg-blue-50 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-2xs disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          add_shopping_cart
                        </span>
                        <span>Thêm vào giỏ</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Xem tất cả nếu còn sản phẩm */}
        {filteredProducts.length > DISPLAY_LIMIT && (
          <div className="text-center mt-8">
            <button
              type="button"
              onClick={() => {
                const targetSlug = selectedCategoryId
                  ? categories.find((c) => c._id === selectedCategoryId)?.slug || 'all'
                  : 'all';
                navigate(`/category/${targetSlug}`);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border-2 border-primary text-primary hover:bg-primary hover:text-white font-extrabold text-xs tracking-wide shadow-xs hover:shadow-lg transition-all cursor-pointer group"
            >
              <span>Xem tất cả sản phẩm</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>
          </div>
        )}
        </>
      )}
    </section>
  );
};

