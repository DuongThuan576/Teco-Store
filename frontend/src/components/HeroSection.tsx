import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brand, Category, Product } from '../types/api';

interface HeroSectionProps {
  categories: Category[];
  brands: Brand[];
  products: Product[];
  onNavigateCategory: (categorySlug: string, brandSlug?: string) => void;
  onSearchHot: (query: string) => void;
}

// Map productType to Material icon
const CATEGORY_ICONS: Record<string, string> = {
  phone: 'smartphone',
  laptop: 'laptop_mac',
  tablet: 'tablet_mac',
  smartwatch: 'watch',
  watch: 'watch',
  audio: 'headphones',
  speaker: 'speaker',
  accessory: 'cable',
  keyboard: 'keyboard',
  mouse: 'mouse',
  storage: 'hard_drive',
  monitor: 'monitor',
  camera: 'photo_camera',
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  categories,
  brands,
  products,
  onNavigateCategory,
  onSearchHot,
}) => {
  const navigate = useNavigate();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // 1. Lấy danh sách parent categories thực tế từ DB (loại trừ dữ liệu test nếu có)
  const realParentCategories = useMemo(() => {
    return categories.filter((c) => !c.parentId && c.productType !== 'test');
  }, [categories]);

  // 2. Tính toán dynamic danh sách items và flyout data hoàn toàn từ DB
  const categoryMenuItems = useMemo(() => {
    return realParentCategories.map((cat) => {
      // Tìm các sub-categories thuộc category này trong DB
      const subCats = categories.filter((c) => c.parentId === cat._id);
      const catIds = [cat._id, ...subCats.map((sc) => sc._id)];

      // Các sản phẩm thuộc danh mục này trong DB
      const catProducts = products.filter(
        (p) => p.categoryId && catIds.includes(p.categoryId),
      );

      // Brands thực tế từ DB liên kết với sản phẩm thuộc danh mục này
      const productBrandIds = new Set(
        catProducts.map((p) => p.brandId).filter(Boolean) as string[],
      );

      // Chỉ lấy đúng các thương hiệu thực tế có sản phẩm trong DB
      const matchedBrands = brands.filter((b) => productBrandIds.has(b._id));

      // Hot items lấy thực tế từ SubCategories và các sản phẩm nổi bật trong DB (tối đa 10 sản phẩm để giao diện gọn đẹp)
      const subCategoryItems = subCats.map((sc) => ({
        name: sc.name,
        slug: sc.slug,
        isProduct: false,
      }));

      const productItems = catProducts.slice(0, 10).map((p) => ({
        name: p.name,
        slug: p.slug,
        isProduct: true,
      }));

      const hotItems = [...subCategoryItems, ...productItems];

      return {
        id: cat._id,
        name: cat.name,
        slug: cat.slug,
        productType: cat.productType,
        icon: CATEGORY_ICONS[cat.productType] || 'devices',
        brands: matchedBrands,
        hotItems,
      };
    });
  }, [realParentCategories, categories, brands, products]);

  const activeCategory = categoryMenuItems.find((m) => m.id === activeCategoryId);

  return (
    <section className="max-w-[1240px] mx-auto px-4 sm:px-margin-desktop pt-space-lg pb-space-sm">
      <div className="grid grid-cols-12 gap-4 relative">
        {/* Left Category Sidebar (Clickbuy Mega-Menu Style hoàn toàn từ DB) */}
        <aside
          className="hidden lg:block lg:col-span-3 bg-white rounded-xl border border-border-subtle p-2 shadow-sm relative z-30"
          onMouseLeave={() => setActiveCategoryId(null)}
        >
          <div className="flex flex-col space-y-0.5">
            {categoryMenuItems.map((item) => {
              const isActive = activeCategoryId === item.id;

              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setActiveCategoryId(item.id)}
                  onClick={() => {
                    setActiveCategoryId(null);
                    onNavigateCategory(item.slug);
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm font-medium ${
                    isActive
                      ? 'bg-red-50 text-red-600 font-semibold'
                      : 'text-gray-800 hover:bg-slate-50 hover:text-red-600'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        isActive ? 'text-red-600' : 'text-red-500'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span
                    className={`material-symbols-outlined text-[18px] transition-colors ${
                      isActive ? 'text-red-600 font-bold' : 'text-gray-300'
                    }`}
                  >
                    chevron_right
                  </span>
                </div>
              );
            })}
          </div>

          {/* Mega-Menu Flyout (Hiển thị Brands & Sản phẩm thực tế từ DB khi hover theo chuẩn Clickbuy) */}
          {activeCategory && (
            <div
              className="absolute left-[calc(100%+8px)] top-0 w-[620px] xl:w-[680px] min-h-[380px] bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 z-40 transition-all animate-fadeIn"
              onMouseEnter={() => setActiveCategoryId(activeCategory.id)}
              onMouseLeave={() => setActiveCategoryId(null)}
            >
              <div className="grid grid-cols-2 gap-8">
                {/* Cột 1: Chọn theo hãng (Từ collection brands của DB) */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3.5">
                    Chọn theo hãng
                  </h4>
                  {activeCategory.brands.length > 0 ? (
                    <div className="flex flex-wrap gap-2.5">
                      {activeCategory.brands.map((b) => (
                        <button
                          key={b._id}
                          type="button"
                          onClick={() => {
                            setActiveCategoryId(null);
                            onNavigateCategory(activeCategory.slug, b.slug);
                          }}
                          className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-400 border border-gray-200 rounded-lg text-xs sm:text-sm font-medium text-gray-700 transition-all cursor-pointer shadow-2xs"
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      Chưa có thương hiệu trong danh mục
                    </p>
                  )}
                </div>

                {/* Cột 2: Sản phẩm nổi bật (Thực tế từ collection products/categories của DB) */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3.5">
                    {activeCategory.name} hot
                  </h4>

                  {activeCategory.hotItems.length > 0 ? (
                    <div className="flex flex-wrap gap-2.5">
                      {activeCategory.hotItems.map((s, idx) => (
                        <button
                          key={`${s.slug}-${idx}`}
                          type="button"
                          onClick={() => {
                            setActiveCategoryId(null);
                            if (s.isProduct) {
                              navigate(`/product/${s.slug}`);
                            } else {
                              onNavigateCategory(s.slug);
                            }
                          }}
                          className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-400 border border-gray-200 rounded-lg text-xs sm:text-sm font-medium text-gray-700 transition-all cursor-pointer shadow-2xs text-left"
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      Chưa có sản phẩm hot
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Center Main Promotional Banner */}
        <div className="col-span-12 lg:col-span-6 relative rounded-xl overflow-hidden shadow-sm border border-border-subtle bg-gradient-to-br from-[#0B3B78] via-[#005ab6] to-[#0472e3] text-white min-h-[380px] flex flex-col justify-between p-6 sm:p-8">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white tracking-wide mb-3 border border-white/30">
              <span className="material-symbols-outlined text-[16px] text-amber-300">
                auto_awesome
              </span>
              CHƯƠNG TRÌNH KHUYẾN MÃI LỚN NHẤT NĂM
            </div>
            <h1 className="text-display-hero-mobile md:text-display-hero font-display-hero text-white leading-tight max-w-md drop-shadow-sm">
              ĐẠI TIỆC CÔNG NGHỆ 2026
            </h1>
            <p className="mt-2 text-white/90 text-headline-sm font-headline-sm">
              SIÊU SALE ĐÓN TẾT
            </p>
            <p className="text-xs text-white/80 mt-1 max-w-sm">
              Tặng gói bảo hành VIP 12 tháng • 1 đổi 1 trong 30 ngày
            </p>
          </div>

          <div className="absolute right-0 bottom-0 w-3/5 h-4/5 pointer-events-none opacity-90 hidden sm:block">
            <img
              className="w-full h-full object-contain object-bottom-right"
              alt="TecoStore Promotional Banner"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFCdbWpwCjPJrNqEoTKlEwWl88qfxUl-LKHpid5dnoA66pu3A8tg3JLbhGSGmz05XHiUdn-BGy4QTTgqKbm-rkjw0nKKlg19ubQkuPgSYkml5xRmnQYvjoGgBTxPShWn1h3Jw7GDgDsjVtOYQg3IkJQ2qVUCsdCYj4jy9rrepKpmxoxne-9401M52MuHXsoVtQ-q611-KjaSWEUVOsIkSDlufwKrzJagJzRBP9ZLGVr04J7mHmROdZrw"
            />
          </div>

          <div className="relative z-10 pt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateCategory('dien-thoai')}
              className="px-6 py-2.5 bg-badge-discount text-white font-body-strong rounded hover:bg-red-600 transition-all shadow-lg active:scale-95 flex items-center gap-2 text-body-sm cursor-pointer"
            >
              <span>Khám phá ưu đãi ngay</span>
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </button>
            <span className="text-xs text-white/80 font-medium">
              Áp dụng từ 15/11 - 15/12/2026
            </span>
          </div>
        </div>

        {/* Right 2 Stacked Sub-banners */}
        <div className="col-span-12 lg:col-span-3 flex flex-col sm:flex-row lg:flex-col gap-4">
          <div className="h-fit bg-white border border-border-subtle rounded-xl p-4 flex flex-col gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="relative z-10">
              <span className="text-[11px] font-bold text-badge-discount uppercase tracking-wide bg-red-50 px-2 py-0.5 rounded">
                iPhone Pro Series
              </span>
              <h3 className="text-title-card font-title-card text-text-primary mt-2">
                Sẵn hàng đủ màu titan
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Trả góp 0% lãi suất • Bảo hành 1 đổi 1 nguyên seal
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between relative z-10">
              <button
                type="button"
                onClick={() => onNavigateCategory('dien-thoai', 'apple')}
                className="text-xs font-bold text-primary flex items-center gap-1 group-hover:underline cursor-pointer"
              >
                Mua ngay giá tốt
                <span className="material-symbols-outlined text-[14px]">
                  arrow_forward
                </span>
              </button>
              <div className="w-16 h-16 flex-shrink-0">
                <img
                  className="w-full h-full object-contain"
                  alt="iPhone Series"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQKjx03tBcXuCszWhlQkS3Hfkx_IrxTVUZtovGl6IWaRgTS7j_5S_xD9TeUEgoEyOIYw4GMArk0jci6ifK5RWnqV6ZrINoVhKPl6gVYjBEnXun0sNDSbgknuqO1K89lk8Ohns1P2gafRpeOJE1nrxGV4ZnkT2II5opAJrNjPqt5f49qeO7ThkHW4d-uv3pJ5PzdYUgy3JrtDxdJzVjMYzT1sWrhmI7J0MwoxiL8wu2UPj5pIzxGk8AGQ"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Value Guarantees Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-2">
        <div className="bg-white rounded-lg border border-border-subtle p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">
              verified_user
            </span>
          </div>
          <div>
            <h4 className="text-body-sm font-body-strong text-text-primary">
              Chính hãng 100%
            </h4>
            <p className="text-[11px] text-text-secondary">
              Xuất hóa đơn điện tử minh bạch
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-border-subtle p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-success-emerald flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">autorenew</span>
          </div>
          <div>
            <h4 className="text-body-sm font-body-strong text-text-primary">
              Bảo hành 1 đổi 1 trong 12 tháng
            </h4>
            <p className="text-[11px] text-text-secondary">
              Lỗi phần cứng đổi máy mới ngay
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-border-subtle p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">bolt</span>
          </div>
          <div>
            <h4 className="text-body-sm font-body-strong text-text-primary">
              Giao siêu tốc 2 giờ
            </h4>
            <p className="text-[11px] text-text-secondary">
              Nội thành Hà Nội &amp; TP. Hồ Chí Minh
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-border-subtle p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">
              credit_card
            </span>
          </div>
          <div>
            <h4 className="text-body-sm font-body-strong text-text-primary">
              Thanh toán tiện lợi
            </h4>
            <p className="text-[11px] text-text-secondary">
              Qua thẻ tín dụng hoặc Ngân hàng
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
