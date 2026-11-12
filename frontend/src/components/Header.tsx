import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Category, Product, User } from '../types/api';

interface HeaderProps {
  categories: Category[];
  products?: Product[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  cartCount: number;
  currentUser?: User | null;
}

const CATEGORY_ICONS: Record<string, string> = {
  phone: 'smartphone',
  laptop: 'laptop_mac',
  tablet: 'tablet_mac',
  accessory: 'headphones',
};

export const Header: React.FC<HeaderProps> = ({
  categories,
  products = [],
  searchQuery,
  onSearchChange,
  cartCount,
  currentUser,
}) => {
  const navigate = useNavigate();

  // Parent categories from backend (excluding test categories)
  const parentCategories = categories.filter(
    (c) => !c.parentId && c.productType !== 'test',
  );

  // Gợi ý từ khóa tìm kiếm lấy trực tiếp từ tên sản phẩm thực tế trong DB
  const hotKeywords = React.useMemo(() => {
    if (!products || products.length === 0) return [];
    return products
      .filter((p) => p.isActive)
      .slice(0, 4)
      .map((p) => p.name);
  }, [products]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/category/all?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      {/* ================= TOP UTILITY NOTIFICATION BAR ================= */}
      <div className="bg-[#0B3B78] text-white py-1 px-4 text-xs font-body-sm hidden md:block">
        <div className="max-w-[1240px] mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <span className="flex items-center space-x-1.5 opacity-90">
              <span className="material-symbols-outlined text-[15px] text-secondary-container">
                phone_in_talk
              </span>
              <span>
                Hotline tư vấn:{' '}
                <strong className="text-white font-semibold">1900 1508</strong> (08:00 -
                22:00)
              </span>
            </span>
            <span className="flex items-center space-x-1.5 opacity-90">
              <span className="material-symbols-outlined text-[15px] text-secondary-container">
                verified
              </span>
              <span>Cam kết sản phẩm chính hãng 100%</span>
            </span>
          </div>
        </div>
      </div>

      <header className="w-full bg-surface-card dark:bg-inverse-surface border-b border-border-subtle dark:border-outline shadow-sm dark:shadow-none sticky top-0 z-50">
        <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-margin-desktop flex flex-col py-space-sm">
          {/* Top Row: Logo, Search, Trailing Actions */}
          <div className="flex items-center justify-between gap-4 py-1">
            {/* Logo */}
            <button
              type="button"
              className="flex items-center gap-2 group flex-shrink-0 text-left cursor-pointer"
              onClick={() => {
                onSearchChange('');
                navigate('/');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-headline-lg font-black shadow-md group-hover:bg-[#1677E8] transition-colors">
                T
              </div>
              <div>
                <span className="text-headline-md font-headline-md font-extrabold text-primary dark:text-inverse-primary tracking-tight">
                  TecoStore
                </span>
                <span className="block text-[10px] text-text-secondary font-medium uppercase tracking-wider -mt-1">
                  Digital Core
                </span>
              </div>
            </button>

            {/* Search Bar with Hot Keyword tags */}
            <div className="flex-1 max-w-2xl px-2">
              <form className="relative flex items-center" onSubmit={handleSearchSubmit}>
                <div className="absolute left-3.5 flex items-center pointer-events-none text-text-secondary">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </div>
                <input
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full h-11 pl-11 pr-24 rounded-lg bg-surface-page border border-border-subtle text-text-primary text-body-default placeholder:text-text-secondary focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Bạn muốn tìm gì hôm nay? (iPhone 18 Pro Max, S24 Ultra, MacBook M3...)"
                  type="text"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="absolute right-24 text-text-secondary hover:text-text-primary p-1"
                    title="Xóa tìm kiếm"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-1.5 h-8 px-4 bg-primary text-white rounded font-body-strong text-body-sm hover:bg-surface-tint active:scale-95 transition-all"
                >
                  Tìm kiếm
                </button>
              </form>
              <div className="items-center gap-3 mt-1 text-[11px] text-text-secondary overflow-hidden whitespace-nowrap hidden sm:flex">
                <span className="font-medium text-text-primary">Gợi ý hot:</span>
                {hotKeywords.map((kw, idx) => (
                  <React.Fragment key={kw}>
                    {idx > 0 && <span className="text-outline-variant">•</span>}
                    <button
                      type="button"
                      onClick={() => {
                        onSearchChange(kw);
                        navigate(`/category/all?q=${encodeURIComponent(kw)}`);
                      }}
                      className="hover:text-primary transition-colors cursor-pointer"
                    >
                      {kw}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Trailing Action Cluster */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (currentUser) {
                    navigate('/account');
                  } else {
                    navigate('/login');
                  }
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-text-secondary hover:bg-surface-container-low hover:text-primary transition-all cursor-pointer text-left"
              >
                <span className="material-symbols-outlined text-[24px] text-primary">
                  account_circle
                </span>
                <div className="text-left leading-tight hidden sm:block max-w-[110px]">
                  <span className="text-[10px] text-text-secondary block truncate">
                    {currentUser ? 'Xin chào,' : 'Tài khoản'}
                  </span>
                  <span className="text-body-sm font-body-strong text-text-primary block truncate">
                    {currentUser
                      ? currentUser.fullName || currentUser.fullname || 'Thành viên'
                      : 'Đăng nhập'}
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate('/cart');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container-low text-primary hover:bg-primary hover:text-white transition-all relative group cursor-pointer"
              >
                <div className="relative">
                  <span className="material-symbols-outlined text-[24px]">shopping_cart</span>
                  <span className="absolute -top-1.5 -right-2 bg-badge-discount text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ring-2 ring-white">
                    {cartCount}
                  </span>
                </div>
                <span className="text-body-sm font-body-strong hidden md:inline">Giỏ hàng</span>
              </button>
            </div>
          </div>

          {/* Navigation Links Strip - Clicks navigate directly via react-router */}
          <nav className="flex items-center space-x-7 pt-2 mt-1 border-t border-border-subtle/60 overflow-x-auto no-scrollbar text-body-strong">
            {/* Trang chủ */}
            <button
              type="button"
              onClick={() => {
                navigate('/');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-text-secondary hover:text-primary pb-1 flex items-center gap-1 whitespace-nowrap transition-colors duration-150 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
              Sản phẩm nổi bật
            </button>

            {/* Category Pages: Điện thoại, Laptop, Phụ kiện */}
            {parentCategories.map((cat) => {
              const iconName = CATEGORY_ICONS[cat.productType] || 'devices';

              return (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => {
                    navigate(`/category/${cat.slug}`);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-text-secondary hover:text-primary pb-1 flex items-center gap-1 whitespace-nowrap transition-colors duration-150 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {iconName}
                  </span>
                  {cat.name}
                </button>
              );
            })}

            <div className="ml-auto hidden xl:flex items-center text-xs font-semibold text-badge-discount bg-red-50 border border-red-200 px-2.5 py-0.5 rounded">
              <span>Thu cũ đổi mới: Trợ giá ngay 2.000.000₫</span>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
};
