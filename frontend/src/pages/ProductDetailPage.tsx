import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Brand, Category, Product, ProductVariant } from '../types/api';
import {
  formatVndPrice,
  getPrimaryVariant,
  getProductImage,
  productsApi,
  FALLBACK_PRODUCT_IMAGES,
} from '../services/api';

interface ProductDetailPageProps {
  categories: Category[];
  brands: Brand[];
  onAddToCart: (product: Product, variant?: ProductVariant, isBuyNow?: boolean) => void;
}

const SPEC_LABELS: Record<string, string> = {
  screenSize: 'Kích thước màn hình',
  screenTechnology: 'Công nghệ màn hình',
  cpu: 'Chip xử lý (CPU)',
  operatingSystem: 'Hệ điều hành',
  ram: 'Dung lượng RAM',
  rearCamera: 'Camera sau',
  frontCamera: 'Camera trước',
  sim: 'Thẻ SIM',
  waterResistance: 'Kháng nước / bụi',
};

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  categories,
  brands,
  onAddToCart,
}) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(undefined);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [loadingSku, setLoadingSku] = useState(false);

  // Fetch product by slug directly from backend API: /api/products/slug/:slug
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    productsApi
      .findBySlug(slug)
      .then((data) => {
        setProduct(data);
        const primary = getPrimaryVariant(data);
        setSelectedVariant(primary);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Không tìm thấy sản phẩm');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  // Gallery images: Lấy toàn bộ ảnh thực tế từ selectedVariant, product và các variants
  const galleryImages = React.useMemo(() => {
    if (!product) return FALLBACK_PRODUCT_IMAGES;
    const list: string[] = [];

    // 1. Ảnh của biến thể đang chọn
    if (selectedVariant?.images && selectedVariant.images.length > 0) {
      for (const img of selectedVariant.images) {
        if (img && !list.includes(img)) list.push(img);
      }
    }

    // 2. Ảnh chung của sản phẩm
    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        if (img && !list.includes(img)) list.push(img);
      }
    }

    // 3. Ảnh từ tất cả các biến thể khác của sản phẩm
    if (product.variants && product.variants.length > 0) {
      for (const v of product.variants) {
        if (v.images) {
          for (const img of v.images) {
            if (img && !list.includes(img)) list.push(img);
          }
        }
      }
    }

    // 4. Nếu hoàn toàn không có ảnh nào, dùng 1 ảnh fallback
    if (list.length === 0) {
      list.push(FALLBACK_PRODUCT_IMAGES[0]);
    }

    return list;
  }, [product, selectedVariant]);

  // Reset activeImageIndex nếu variant thay đổi
  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedVariant]);

  if (loading) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-6 h-96 bg-slate-200 rounded-2xl" />
            <div className="md:col-span-6 space-y-4">
              <div className="h-8 bg-slate-200 rounded w-3/4" />
              <div className="h-16 bg-slate-200 rounded" />
              <div className="h-32 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 py-16 text-center">
        <span className="material-symbols-outlined text-[64px] text-badge-discount">
          error
        </span>
        <h2 className="text-xl font-bold text-text-primary mt-3">
          Không tìm thấy thông tin sản phẩm
        </h2>
        <p className="text-xs text-text-secondary mt-1">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-6 px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-surface-tint transition-all cursor-pointer"
        >
          Quay lại Trang chủ
        </button>
      </div>
    );
  }

  const variants = product.variants || [];
  const colors = Array.from(
    new Set(variants.map((v) => v.color).filter(Boolean)),
  ) as string[];
  const storages = Array.from(
    new Set(variants.map((v) => v.storage).filter(Boolean)),
  ) as string[];

  const handleSelectOption = async (color?: string, storage?: string) => {
    const targetColor = color ?? selectedVariant?.color;
    const targetStorage = storage ?? selectedVariant?.storage;

    const matched =
      variants.find((v) => v.color === targetColor && v.storage === targetStorage) ||
      variants.find((v) => (color ? v.color === color : v.storage === storage));

    if (!matched) return;

    setSelectedVariant(matched);

    // Call backend API /api/products/slug/:slug/variants/:sku to verify details
    if (product.slug && matched.sku) {
      setLoadingSku(true);
      try {
        const res = await productsApi.findVariantBySku(product.slug, matched.sku);
        if (res?.variant) {
          setSelectedVariant(res.variant);
        }
      } catch {
        // Fallback to matched variant
      } finally {
        setLoadingSku(false);
      }
    }
  };

  const category = categories.find((c) => c._id === product.categoryId);
  const brand = brands.find((b) => b._id === product.brandId);
  const specs = product.specifications || {};

  const currentPrice = selectedVariant?.price;

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-margin-desktop py-space-sm">
      {/* ================= BREADCRUMBS ================= */}
      <nav className="flex items-center space-x-2 text-xs text-text-secondary py-2 mb-2 flex-wrap">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[15px]">home</span>
          Trang chủ
        </button>
        <span className="text-outline-variant">/</span>
        {category && (
          <>
            <button
              type="button"
              onClick={() => navigate(`/category/${category.slug}`)}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              {category.name}
            </button>
            <span className="text-outline-variant">/</span>
          </>
        )}
        {brand && (
          <>
            <span className="text-text-secondary">{brand.name}</span>
            <span className="text-outline-variant">/</span>
          </>
        )}
        <span className="text-text-primary font-semibold truncate max-w-xs sm:max-w-md">
          {product.name}
        </span>
      </nav>

      {/* ================= PRODUCT TITLE BAR ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-text-primary">
            {product.name}
            {selectedVariant?.storage ? ` ${selectedVariant.storage}` : ''}
            {selectedVariant?.color ? ` - ${selectedVariant.color}` : ''}
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span className="font-mono text-slate-500">Mã SKU: {selectedVariant?.sku || 'N/A'}</span>
          <span>•</span>
          <span className="text-slate-600 font-medium">Tồn kho: {selectedVariant?.stock ?? 0}</span>
        </div>
      </div>

      {/* ================= MAIN DETAIL LAYOUT ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
        {/* Left Column: Image Gallery + Mô tả sản phẩm thực tế từ DB (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Main Large Image */}
          <div className="aspect-square rounded-2xl bg-white border border-border-subtle p-6 flex items-center justify-center relative overflow-hidden shadow-xs">
            <img
              src={galleryImages[activeImageIndex]}
              alt={product.name}
              className="w-full h-full object-contain transition-all duration-300"
            />
          </div>

          {/* Thumbnails (Hiển thị tất cả ảnh thực tế có trong sản phẩm & biến thể) */}
          {galleryImages.length > 1 && (
            <div className="grid grid-cols-4 gap-2.5">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`aspect-square rounded-xl bg-white border p-1.5 transition-all cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-primary ring-2 ring-primary/20 shadow-xs'
                      : 'border-border-subtle hover:border-slate-400'
                  }`}
                >
                  <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}

          {/* Mô tả sản phẩm thực tế từ trường description của DB */}
          {product.description && (
            <div className="bg-white border border-border-subtle rounded-xl p-4 text-xs space-y-2 text-text-secondary">
              <div className="font-bold text-text-primary flex items-center gap-1.5 text-xs">
                <span className="material-symbols-outlined text-[17px] text-primary">
                  description
                </span>
                Mô tả sản phẩm
              </div>
              <p className="leading-relaxed text-slate-700 whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Pricing, Storage, Color, Buy buttons, Specs Table (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            {/* Price Banner */}
            <div className="bg-gradient-to-r from-red-50 via-rose-50/50 to-amber-50/40 border border-red-100 rounded-2xl p-5 mb-5 shadow-xs">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl font-extrabold text-badge-discount">
                  {formatVndPrice(currentPrice)}
                </span>
                {loadingSku && (
                  <span className="text-xs text-primary font-semibold animate-pulse">
                    Đang đồng bộ SKU...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2 text-xs text-slate-700 font-semibold">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">inventory_2</span>
                <span>Số lượng có sẵn trong kho: <strong>{selectedVariant?.stock ?? 0} sản phẩm</strong></span>
              </div>
            </div>

            {/* Storage Selection (ROM) */}
            {storages.length > 0 && (
              <div className="mb-5">
                <div className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>1. Chọn dung lượng bộ nhớ:</span>
                  <span className="text-primary font-bold">{selectedVariant?.storage}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {storages.map((st) => {
                    const isSelected = selectedVariant?.storage === st;
                    const sampleVar = variants.find(
                      (v) =>
                        v.storage === st &&
                        (!selectedVariant?.color || v.color === selectedVariant.color),
                    );
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleSelectOption(undefined, st)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-blue-50/70 ring-2 ring-primary/30 shadow-xs'
                            : 'border-border-subtle bg-white hover:border-primary/50'
                        }`}
                      >
                        <div className="text-sm font-bold text-text-primary">{st}</div>
                        {sampleVar && (
                          <div className="text-xs text-badge-discount font-bold mt-1">
                            {formatVndPrice(sampleVar.price)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {colors.length > 0 && (
              <div className="mb-5">
                <div className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>2. Chọn màu sắc:</span>
                  <span className="text-primary font-bold">{selectedVariant?.color}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {colors.map((col) => {
                    const isSelected = selectedVariant?.color === col;
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => handleSelectOption(col, undefined)}
                        className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-blue-50/70 text-primary ring-2 ring-primary/30 shadow-xs'
                            : 'border-border-subtle bg-white text-text-primary hover:border-primary/50'
                        }`}
                      >
                        <span>{col}</span>
                        {isSelected && (
                          <span className="material-symbols-outlined text-[16px] text-primary">
                            check_circle
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons Cluster */}
            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={() => onAddToCart(product, selectedVariant, true)}
                className="w-full py-4 bg-badge-discount hover:bg-red-600 text-white font-extrabold text-base rounded-xl shadow-lg hover:shadow-xl transition-all flex flex-col items-center justify-center cursor-pointer active:scale-98"
              >
                <span>MUA NGAY</span>
                <span className="text-xs font-normal opacity-90">
                  Giao tận nơi hoặc nhận tại cửa hàng
                </span>
              </button>
              <button
                type="button"
                onClick={() => onAddToCart(product, selectedVariant, false)}
                className="w-full py-3 bg-white border border-primary text-primary hover:bg-blue-50 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                <span>Thêm vào giỏ hàng</span>
              </button>
            </div>

            {/* Tech Specifications Table (Stitch Style) */}
            {Object.keys(specs).length > 0 && (
              <div className="bg-white border border-border-subtle rounded-2xl overflow-hidden shadow-xs mt-6">
                <div className="bg-slate-50 px-4 py-3 font-bold text-sm text-text-primary border-b border-border-subtle flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">memory</span>
                    Thông số kỹ thuật {product.name}
                  </span>
                  <span className="text-[11px] text-primary font-bold">VN/A Chuẩn</span>
                </div>
                <div className="divide-y divide-border-subtle text-xs">
                  {Object.entries(specs).map(([key, val]) => (
                    <div key={key} className="grid grid-cols-12 px-4 py-2.5 hover:bg-slate-50/50">
                      <span className="col-span-5 text-text-secondary font-medium">
                        {SPEC_LABELS[key] || key}
                      </span>
                      <span className="col-span-7 font-bold text-text-primary">
                        {typeof val === 'boolean'
                          ? val
                            ? 'Có hỗ trợ'
                            : 'Không'
                          : String(val)}
                      </span>
                    </div>
                  ))}
                  {selectedVariant?.storage && (
                    <div className="grid grid-cols-12 px-4 py-2.5 hover:bg-slate-50/50">
                      <span className="col-span-5 text-text-secondary font-medium">Bộ nhớ lưu trữ</span>
                      <span className="col-span-7 font-bold text-text-primary">{selectedVariant.storage}</span>
                    </div>
                  )}
                  {selectedVariant?.color && (
                    <div className="grid grid-cols-12 px-4 py-2.5 hover:bg-slate-50/50">
                      <span className="col-span-5 text-text-secondary font-medium">Màu sắc phiên bản</span>
                      <span className="col-span-7 font-bold text-text-primary">{selectedVariant.color}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

