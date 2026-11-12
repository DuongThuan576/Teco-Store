import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Brand, Category, Product, ProductLine } from '../types/api';
import {
  formatVndPrice,
  getPrimaryVariant,
  getProductImage,
  getProductSpecChips,
  getTotalStock,
} from '../services/api';

interface CategoryPageProps {
  categories: Category[];
  brands: Brand[];
  products: Product[];
  productLines?: ProductLine[];
  loading: boolean;
  onAddToCart: (product: Product) => void;
}

type SortOption = 'best' | 'price-asc' | 'price-desc' | 'promo' | 'newest';

export const CategoryPage: React.FC<CategoryPageProps> = ({
  categories,
  brands,
  products,
  productLines = [],
  loading,
  onAddToCart,
}) => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentCategorySlug = slug || 'dien-thoai';
  const selectedBrandSlug = searchParams.get('brand');
  const selectedProductLineSlug = searchParams.get('series');
  const searchQuery = searchParams.get('q') || '';

  const [sortOption, setSortOption] = useState<SortOption>('best');
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);

  const isAllCategories = currentCategorySlug === 'all' || currentCategorySlug === 'tat-ca';
  const currentCategory = isAllCategories ? null : categories.find((c) => c.slug === currentCategorySlug);
  const categoryTitle = isAllCategories
    ? searchQuery ? `Kết quả tìm kiếm cho "${searchQuery}"` : 'Tất cả sản phẩm'
    : currentCategory?.name || 'Danh mục sản phẩm';

  // Sub-categories if any
  const childCategoryIds = useMemo(() => {
    if (!currentCategory) return [];
    return categories
      .filter((c) => c.parentId === currentCategory._id)
      .map((c) => c._id);
  }, [categories, currentCategory]);

  const targetCategoryIds = useMemo(() => {
    if (!currentCategory) return [];
    return [currentCategory._id, ...childCategoryIds];
  }, [currentCategory, childCategoryIds]);

  // Brands directly from backend API
  const brandPills = useMemo(() => {
    const activeBrands = brands.filter((b) => b.status === 'active');
    return [
      { name: 'Tất cả', slug: null },
      ...activeBrands.map((b) => ({ name: b.name, slug: b.slug })),
    ];
  }, [brands]);

  // Storage filters
  const storageOptions = ['128GB', '256GB', '512GB', '1TB', '2TB'];

  // Price range options
  const priceOptions = [
    { label: 'Tất cả mức giá', value: null },
    { label: 'Dưới 10 triệu', value: '<10' },
    { label: 'Từ 10 - 20 triệu', value: '10-20' },
    { label: 'Trên 20 triệu', value: '>20' },
  ];

  const handleBrandSelect = (bSlug: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (bSlug) {
      next.set('brand', bSlug);
    } else {
      next.delete('brand');
    }
    next.delete('series');
    setSearchParams(next);
  };

  const handleProductLineSelect = (plSlug: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (plSlug) {
      next.set('series', plSlug);
    } else {
      next.delete('series');
    }
    setSearchParams(next);
  };

  // Dòng sản phẩm / Series tương ứng với Category và Brand đang chọn
  const availableProductLines = useMemo(() => {
    if (!productLines || productLines.length === 0) return [];
    return productLines.filter((pl) => {
      const matchCat = targetCategoryIds.includes(pl.categoryId);
      if (selectedBrandSlug) {
        const brandObj = brands.find((b) => b.slug === selectedBrandSlug);
        if (brandObj && pl.brandId !== brandObj._id) return false;
      }
      return matchCat;
    });
  }, [productLines, targetCategoryIds, selectedBrandSlug, brands]);

  // Filter & Sort Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Chỉ hiển thị sản phẩm đang kinh doanh (isActive = true)
        if (!p.isActive) return false;

        // Category filter
        if (targetCategoryIds.length > 0) {
          if (!p.categoryId || !targetCategoryIds.includes(p.categoryId)) {
            return false;
          }
        }

        // Brand filter
        if (selectedBrandSlug) {
          const brandObj = brands.find((b) => b.slug === selectedBrandSlug);
          if (brandObj && p.brandId !== brandObj._id) {
            return false;
          }
          if (!brandObj && !p.name.toLowerCase().includes(selectedBrandSlug)) {
            return false;
          }
        }

        // ProductLine (Series) filter
        if (selectedProductLineSlug) {
          const plObj = productLines.find((pl) => pl.slug === selectedProductLineSlug);
          if (plObj && p.productLineId !== plObj._id) {
            return false;
          }
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.name?.toLowerCase().includes(q);
          const matchSlug = p.slug?.toLowerCase().includes(q);
          const matchSku = p.variants?.some((v) => v.sku?.toLowerCase().includes(q));
          if (!matchName && !matchSlug && !matchSku) return false;
        }

        // Storage filter
        if (selectedStorage) {
          const hasStorage = p.variants?.some(
            (v) => v.storage?.toLowerCase() === selectedStorage.toLowerCase(),
          );
          if (!hasStorage) return false;
        }

        // Price range filter
        if (selectedPriceRange) {
          const primaryVar = getPrimaryVariant(p);
          const price = primaryVar?.price || 0;
          if (selectedPriceRange === '<10' && price >= 10000000) return false;
          if (
            selectedPriceRange === '10-20' &&
            (price < 10000000 || price > 20000000)
          )
            return false;
          if (selectedPriceRange === '>20' && price <= 20000000) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priceA = getPrimaryVariant(a)?.price || 0;
        const priceB = getPrimaryVariant(b)?.price || 0;
        if (sortOption === 'price-asc') return priceA - priceB;
        if (sortOption === 'price-desc') return priceB - priceA;
        if (sortOption === 'newest') return (b._id > a._id ? 1 : -1);
        return 0;
      });
  }, [
    products,
    targetCategoryIds,
    selectedBrandSlug,
    brands,
    searchQuery,
    selectedStorage,
    selectedPriceRange,
    sortOption,
  ]);

  // ================= PAGINATION LOGIC (16 sản phẩm / trang) =================
  const ITEMS_PER_PAGE = 16;
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const [currentPage, setCurrentPage] = useState<number>(() =>
    Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam,
  );

  // Đồng bộ với URL param ?page=
  useEffect(() => {
    const p = parseInt(searchParams.get('page') || '1', 10);
    setCurrentPage(Number.isNaN(p) || p < 1 ? 1 : p);
  }, [searchParams]);

  // Tự động về trang 1 khi thay đổi bất kỳ bộ lọc, tìm kiếm hay danh mục nào
  useEffect(() => {
    setCurrentPage(1);
  }, [
    currentCategorySlug,
    selectedBrandSlug,
    selectedProductLineSlug,
    searchQuery,
    selectedStorage,
    selectedPriceRange,
    sortOption,
  ]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;

  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, startIndex]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === safePage) return;
    setCurrentPage(newPage);
    const next = new URLSearchParams(searchParams);
    if (newPage === 1) {
      next.delete('page');
    } else {
      next.set('page', String(newPage));
    }
    setSearchParams(next);

    const productGridEl = document.getElementById('category-product-grid');
    if (productGridEl) {
      productGridEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 350, behavior: 'smooth' });
    }
  };

  const getPaginationItems = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (safePage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages];
  };

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-margin-desktop py-space-sm">
      {/* ================= BREADCRUMBS ================= */}
      <nav className="flex items-center space-x-2 text-xs text-text-secondary py-2 mb-2">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[15px]">home</span>
          Trang chủ
        </button>
        <span className="text-outline-variant">/</span>
        <span className="text-text-primary font-semibold">{categoryTitle}</span>
        {selectedBrandSlug && (
          <>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-bold uppercase">{selectedBrandSlug}</span>
          </>
        )}
      </nav>

      {/* ================= CATEGORY HEADER TITLE ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <h1 className="text-headline-lg font-headline-lg text-text-primary">
            {categoryTitle}
          </h1>
          <span className="text-xs text-text-secondary font-medium mt-1">
            ({filteredProducts.length} sản phẩm)
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full w-fit">
          <span className="material-symbols-outlined text-[16px]">verified</span>
          100% Phân phối chính thức - Bảo hành 12 tháng 1 đổi 1
        </div>
      </div>

      {/* ================= TOP PROMOTIONAL BANNER ================= */}
      <div className="my-4 bg-gradient-to-r from-[#0B3B78] via-[#005ab6] to-[#0472e3] rounded-2xl p-6 text-white relative overflow-hidden shadow-sm">
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-1.5 bg-badge-discount text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-2">
            <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
            FLASH SALE THÁNG 11
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
            Đại tiệc {categoryTitle} – Giảm tới 20% 
          </h2>
          <p className="text-xs text-white/90 mt-2">
            Áp dụng đồng thời ưu đãi trả góp 0% lãi suất qua thẻ tín dụng và công ty tài chính. Tặng gói bảo hành VIP rơi vỡ 12 tháng.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('category-products-grid');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2 bg-white text-primary font-bold text-xs rounded-lg hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow"
            >
              Săn deal ngay
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
            <span className="text-[11px] text-white/80">Thời gian có hạn</span>
          </div>
        </div>
        <div className="absolute right-4 -bottom-6 w-56 h-56 opacity-85 hidden sm:block pointer-events-none">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQKjx03tBcXuCszWhlQkS3Hfkx_IrxTVUZtovGl6IWaRgTS7j_5S_xD9TeUEgoEyOIYw4GMArk0jci6ifK5RWnqV6ZrINoVhKPl6gVYjBEnXun0sNDSbgknuqO1K89lk8Ohns1P2gafRpeOJE1nrxGV4ZnkT2II5opAJrNjPqt5f49qeO7ThkHW4d-uv3pJ5PzdYUgy3JrtDxdJzVjMYzT1sWrhmI7J0MwoxiL8wu2UPj5pIzxGk8AGQ"
            alt="Hero banner"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* ================= BRAND FILTER PILLS (Clickbuy Style) ================= */}
      <div className="bg-white border border-border-subtle rounded-xl p-4 shadow-xs mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-primary text-[18px]">
            branding_watermark
          </span>
          <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Thương hiệu:
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {brandPills.map((pill) => {
            const isSelected = selectedBrandSlug === pill.slug;
            return (
              <button
                key={pill.name}
                type="button"
                onClick={() => handleBrandSelect(pill.slug)}
                className={`px-4 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary text-white shadow-xs'
                    : 'border-border-subtle text-slate-700 bg-surface-page hover:border-primary hover:text-primary hover:bg-white'
                }`}
              >
                {pill.name}
              </button>
            );
          })}
        </div>

        {/* Series / Dòng sản phẩm (từ ProductLines thật trong MongoDB) */}
        {availableProductLines.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border-subtle/70">
            <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-primary">category</span>
              <span>Dòng sản phẩm / Series:</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => handleProductLineSelect(null)}
                className={`px-3 py-1 rounded-lg border text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  !selectedProductLineSlug
                    ? 'border-primary bg-blue-50 text-primary font-bold'
                    : 'border-border-subtle text-slate-600 bg-white hover:border-primary/50'
                }`}
              >
                Tất cả dòng máy
              </button>
              {availableProductLines.map((pl) => {
                const isSelected = selectedProductLineSlug === pl.slug;
                return (
                  <button
                    key={pl._id}
                    type="button"
                    onClick={() => handleProductLineSelect(pl.slug)}
                    className={`px-3 py-1 rounded-lg border text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-blue-50 text-primary font-bold'
                        : 'border-border-subtle text-slate-600 bg-white hover:border-primary/50'
                    }`}
                  >
                    {pl.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================= ADVANCED FILTER DROPDOWNS ================= */}
      <div className="bg-white border border-border-subtle rounded-xl p-4 shadow-xs mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider">
            <span className="material-symbols-outlined text-primary text-[18px]">tune</span>
            Bộ lọc nâng cao
          </span>
          {(selectedStorage || selectedPriceRange || selectedBrandSlug || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedStorage(null);
                setSelectedPriceRange(null);
                setSearchParams(new URLSearchParams());
              }}
              className="text-xs text-badge-discount hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">refresh</span>
              Xóa tất cả bộ lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Price Range Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary mb-1">
              Mức giá
            </label>
            <select
              value={selectedPriceRange || ''}
              onChange={(e) => setSelectedPriceRange(e.target.value || null)}
              className="w-full text-xs border border-border-subtle rounded-lg px-2.5 py-2 bg-surface-page focus:outline-none focus:border-primary font-medium text-text-primary"
            >
              {priceOptions.map((opt) => (
                <option key={opt.label} value={opt.value || ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Storage Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary mb-1">
              Bộ nhớ trong
            </label>
            <select
              value={selectedStorage || ''}
              onChange={(e) => setSelectedStorage(e.target.value || null)}
              className="w-full text-xs border border-border-subtle rounded-lg px-2.5 py-2 bg-surface-page focus:outline-none focus:border-primary font-medium text-text-primary"
            >
              <option value="">Tất cả dung lượng</option>
              {storageOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Special Feature */}
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary mb-1">
              Tính năng đặc biệt
            </label>
            <select className="w-full text-xs border border-border-subtle rounded-lg px-2.5 py-2 bg-surface-page focus:outline-none focus:border-primary font-medium text-text-primary">
              <option value="">Tất cả tính năng</option>
              <option value="5g">Hỗ trợ 5G</option>
              <option value="oled">Màn hình OLED / 120Hz</option>
              <option value="water">Kháng nước IP68</option>
            </select>
          </div>

          {/* Promotional Policy */}
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary mb-1">
              Chính sách ưu đãi
            </label>
            <select className="w-full text-xs border border-border-subtle rounded-lg px-2.5 py-2 bg-surface-page focus:outline-none focus:border-primary font-medium text-text-primary">
              <option value="">Tất cả ưu đãi</option>
              <option value="installment">Trả góp 0% Lãi suất</option>
              <option value="tradein">Trợ giá Thu cũ đổi mới</option>
            </select>
          </div>
        </div>

        {/* Active tags */}
        {(selectedPriceRange || selectedStorage || selectedBrandSlug || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border-subtle/60 text-xs">
            <span className="text-text-secondary font-medium">Đang lọc theo:</span>
            {searchQuery && (
              <span className="bg-blue-50 text-primary border border-blue-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                Tìm kiếm: &ldquo;{searchQuery}&rdquo;
                <button
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete('q');
                    setSearchParams(next);
                  }}
                  className="hover:text-red-600 font-bold ml-1 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
            {selectedBrandSlug && (
              <span className="bg-blue-50 text-primary border border-blue-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                Hãng: {selectedBrandSlug.toUpperCase()}
                <button
                  type="button"
                  onClick={() => handleBrandSelect(null)}
                  className="hover:text-red-600 font-bold ml-1 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
            {selectedPriceRange && (
              <span className="bg-blue-50 text-primary border border-blue-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                {priceOptions.find((o) => o.value === selectedPriceRange)?.label}
                <button
                  type="button"
                  onClick={() => setSelectedPriceRange(null)}
                  className="hover:text-red-600 font-bold ml-1 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
            {selectedStorage && (
              <span className="bg-blue-50 text-primary border border-blue-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                ROM: {selectedStorage}
                <button
                  type="button"
                  onClick={() => setSelectedStorage(null)}
                  className="hover:text-red-600 font-bold ml-1 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ================= SORTING BAR ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
          <span className="text-text-secondary font-semibold whitespace-nowrap">
            Sắp xếp theo:
          </span>
          <button
            type="button"
            onClick={() => setSortOption('best')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              sortOption === 'best'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white border border-border-subtle text-slate-700 hover:text-primary'
            }`}
          >
            Bán chạy nhất
          </button>
          <button
            type="button"
            onClick={() => setSortOption('price-asc')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              sortOption === 'price-asc'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white border border-border-subtle text-slate-700 hover:text-primary'
            }`}
          >
            Giá thấp đến cao
          </button>
          <button
            type="button"
            onClick={() => setSortOption('price-desc')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              sortOption === 'price-desc'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white border border-border-subtle text-slate-700 hover:text-primary'
            }`}
          >
            Giá cao đến thấp
          </button>
          <button
            type="button"
            onClick={() => setSortOption('newest')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              sortOption === 'newest'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white border border-border-subtle text-slate-700 hover:text-primary'
            }`}
          >
            Mới ra mắt
          </button>
        </div>

        <span className="text-xs text-text-secondary">
          {totalPages > 1 ? (
            <>
              Tìm thấy <strong className="text-text-primary">{filteredProducts.length}</strong> sản phẩm (Trang{' '}
              <strong className="text-primary">{safePage}</strong>/{totalPages})
            </>
          ) : (
            <>
              Hiển thị <strong className="text-text-primary">{filteredProducts.length}</strong> sản phẩm
            </>
          )}
        </span>
      </div>

      {/* ================= PRODUCTS GRID (Clicking card navigates to /product/:slug) ================= */}
      <div id="category-products-grid">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
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
          <div className="bg-white border border-border-subtle rounded-2xl p-12 text-center my-6">
            <span className="material-symbols-outlined text-[48px] text-text-secondary">
              search_off
            </span>
            <h3 className="text-body-strong font-bold text-text-primary text-lg mt-2">
              Không có sản phẩm nào phù hợp với bộ lọc này
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-md mx-auto">
              Hiện tại danh mục <strong>{categoryTitle}</strong> chưa có sản phẩm khớp với tiêu chí lựa chọn của bạn. Vui lòng thử chọn lại hãng hoặc xóa bộ lọc.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedStorage(null);
                setSelectedPriceRange(null);
                setSearchParams(new URLSearchParams());
                navigate('/category/dien-thoai');
              }}
              className="mt-4 px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-surface-tint transition-all cursor-pointer"
            >
              Xem tất cả sản phẩm
            </button>
          </div>
        ) : (
          <>
            <div id="category-product-grid" className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {paginatedProducts.map((product, index) => {
                const primaryVariant = getPrimaryVariant(product);
                const totalStock = getTotalStock(product);
                const chips = getProductSpecChips(product);
                const imageUrl = getProductImage(product, index);
                const price = primaryVariant?.price;
                const brand = brands.find((b) => b._id === product.brandId);

                return (
                  <div
                    key={product._id}
                    onClick={() => {
                      navigate(`/product/${product.slug}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="bg-white border border-border-subtle rounded-xl p-3.5 hover:shadow-xl hover:border-primary/50 transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      {/* Image */}
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

                      <h3 className="text-title-card font-title-card text-text-primary line-clamp-2 min-h-[44px] group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(product);
                          }}
                          className="px-3 py-1 bg-primary text-white text-[11px] font-bold rounded hover:bg-surface-tint active:scale-95 transition-all cursor-pointer"
                        >
                          Thêm vào giỏ
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ================= PAGINATION CONTROLS (Tối đa 16 sản phẩm / trang) ================= */}
            {totalPages > 1 && (
              <div className="mt-8 pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/70 backdrop-blur-xs p-4 rounded-2xl border border-border-subtle shadow-xs">
                <div className="text-xs text-text-secondary">
                  Hiển thị <span className="font-bold text-text-primary">{startIndex + 1}</span> -{' '}
                  <span className="font-bold text-text-primary">
                    {Math.min(startIndex + ITEMS_PER_PAGE, filteredProducts.length)}
                  </span>{' '}
                  trên tổng số <span className="font-bold text-primary">{filteredProducts.length}</span> sản phẩm
                </div>

                <nav className="flex items-center space-x-1.5" aria-label="Phân trang sản phẩm">
                  {/* Nút Trước */}
                  <button
                    type="button"
                    onClick={() => handlePageChange(safePage - 1)}
                    disabled={safePage <= 1}
                    className="px-3 py-2 rounded-xl border border-border-subtle bg-white text-xs font-bold text-text-primary hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    <span className="hidden sm:inline">Trước</span>
                  </button>

                  {/* Các nút số trang */}
                  {getPaginationItems().map((item, idx) => {
                    if (item === '...') {
                      return (
                        <span
                          key={`dots-${idx}`}
                          className="w-9 h-9 flex items-center justify-center text-xs text-text-secondary select-none font-bold"
                        >
                          ...
                        </span>
                      );
                    }

                    const pageNum = Number(item);
                    const isActive = pageNum === safePage;

                    return (
                      <button
                        key={`page-${pageNum}`}
                        type="button"
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                          isActive
                            ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20'
                            : 'border border-border-subtle bg-white text-text-primary hover:border-primary hover:text-primary hover:bg-blue-50/50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {/* Nút Sau */}
                  <button
                    type="button"
                    onClick={() => handlePageChange(safePage + 1)}
                    disabled={safePage >= totalPages}
                    className="px-3 py-2 rounded-xl border border-border-subtle bg-white text-xs font-bold text-text-primary hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <span className="hidden sm:inline">Sau</span>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>

      {/* ================= SEO & BUYING ADVICE BOTTOM CARD (Clickbuy Style) ================= */}
      <div className="mt-10 bg-white border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xs">
        <h3 className="text-headline-sm font-headline-sm text-text-primary mb-2">
          Kinh nghiệm chọn mua {categoryTitle.toLowerCase()} chính hãng phù hợp tại TecoStore
        </h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          {categoryTitle} là thiết bị công nghệ thiết yếu không thể thiếu trong kỷ nguyên số. Tại hệ thống TecoStore, tất cả các mẫu máy đều có nguồn gốc xuất xứ rõ ràng, mã phân phối chính hãng VN/A cho thị trường Việt Nam với đầy đủ hoá đơn VAT điện tử và gói bảo hành toàn diện.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-4 border-t border-border-subtle/70">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[24px] text-primary">
              verified
            </span>
            <div>
              <h4 className="text-xs font-bold text-text-primary">
                Cam kết 100% Chính Hãng VN/A
              </h4>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Máy mới nguyên seal từ Apple, Samsung, Xiaomi... Phụ kiện đồng bộ theo tiêu chuẩn nhà sản xuất, bảo hành điện tử chính xác.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[24px] text-emerald-600">
              autorenew
            </span>
            <div>
              <h4 className="text-xs font-bold text-text-primary">
                1 Đổi 1 Trong 30 Ngày
              </h4>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Yên tâm trải nghiệm máy. Nếu phát sinh bất kỳ lỗi phần cứng từ nhà sản xuất, TecoStore đổi máy mới ngay lập tức không chờ đợi.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[24px] text-purple-600">
              credit_card
            </span>
            <div>
              <h4 className="text-xs font-bold text-text-primary">
                Trả Góp 0% Lãi Suất
              </h4>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Liên kết hơn 25 ngân hàng đối tác và các công ty tài chính Home Credit, FE Credit, HD SAISON với thủ tục duyệt hồ sơ chỉ 5 phút.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

