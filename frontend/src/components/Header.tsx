import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category, Product, User } from '../types/api';
import { authApi } from '../services/api';

interface HeaderProps {
  categories: Category[];
  products?: Product[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  cartCount: number;
  currentUser?: User | null;
  onLogout?: () => void;
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
  onLogout,
}) => {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleHeaderLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors
    } finally {
      setLoggingOut(false);
      onLogout?.();
      navigate('/login');
    }
  };

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
              {(currentUser?.role === 'admin' ||
                currentUser?.role === 'employee' ||
                currentUser?.role === 'staff') && (
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/admin');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-all cursor-pointer font-bold text-xs"
                  >
                    <span className="material-symbols-outlined text-[20px] text-amber-600">
                      admin_panel_settings
                    </span>
                    <span className="hidden lg:inline">Quản trị</span>
                  </button>
                )}
              <div className="relative group/user">
                <button
                  type="button"
                  onClick={() => {
                    if (currentUser) {
                      navigate('/account', { state: { tab: 'profile' } });
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
                  <div className="text-left leading-tight hidden sm:block max-w-[120px]">
                    <span className="text-[10px] text-text-secondary block truncate">
                      {currentUser ? 'Xin chào,' : 'Tài khoản'}
                    </span>
                    <span className="text-body-sm font-body-strong text-text-primary flex items-center gap-0.5">
                      <span className="truncate">
                        {currentUser
                          ? currentUser.fullName || currentUser.fullname || 'Thành viên'
                          : 'Đăng nhập'}
                      </span>
                      {currentUser && (
                        <span className="material-symbols-outlined text-[15px] text-text-secondary shrink-0">
                          expand_more
                        </span>
                      )}
                    </span>
                  </div>
                </button>

                {currentUser && (
                  <div className="invisible opacity-0 group-hover/user:visible group-hover/user:opacity-100 transition-all duration-150 absolute right-0 top-full pt-1.5 z-50 w-60">
                    <div className="bg-white border border-border-subtle rounded-2xl shadow-xl p-2 text-xs space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/account', { state: { tab: 'profile' } });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/70 text-left transition-colors cursor-pointer block border-b border-border-subtle/60"
                      >
                        <span className="font-extrabold text-text-primary block truncate">
                          {currentUser.fullName || currentUser.fullname || 'Thành viên'}
                        </span>
                        <span className="text-[11px] text-primary font-semibold flex items-center justify-between mt-0.5">
                          <span>Quản lý tài khoản</span>
                          <span className="material-symbols-outlined text-[14px]">
                            arrow_forward
                          </span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigate('/account', { state: { tab: 'profile' } });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full px-3 py-2.5 rounded-xl hover:bg-blue-50 text-text-primary hover:text-primary font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          person
                        </span>
                        <span>Hồ sơ &amp; Đổi mật khẩu</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigate('/account', { state: { tab: 'addresses' } });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full px-3 py-2.5 rounded-xl hover:bg-blue-50 text-text-primary hover:text-primary font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          location_on
                        </span>
                        <span>Sổ địa chỉ nhận hàng</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigate('/account', { state: { tab: 'orders' } });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full px-3 py-2.5 rounded-xl hover:bg-blue-50 text-text-primary hover:text-primary font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          receipt_long
                        </span>
                        <span>Lịch sử đơn hàng</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigate('/account', { state: { tab: 'vouchers' } });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full px-3 py-2.5 rounded-xl hover:bg-blue-50 text-text-primary hover:text-primary font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          confirmation_number
                        </span>
                        <span>Kho Voucher</span>
                      </button>

                      <div className="pt-1 mt-1 border-t border-border-subtle/70">
                        <button
                          type="button"
                          disabled={loggingOut}
                          onClick={() => void handleHeaderLogout()}
                          className="w-full px-3 py-2.5 rounded-xl hover:bg-red-50 text-badge-discount font-bold flex items-center gap-2.5 transition-colors cursor-pointer text-left disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            logout
                          </span>
                          <span>{loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
          <nav className="flex items-center space-x-7 pt-2.5 pb-1.5 mt-1 border-t border-border-subtle/60 overflow-x-auto thin-scrollbar text-body-strong">
            {/* Tất cả sản phẩm */}
            <button
              type="button"
              onClick={() => {
                navigate('/category/all');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="h-8 text-text-secondary hover:text-primary inline-flex items-center justify-center gap-1.5 leading-none whitespace-nowrap transition-colors duration-150 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
              <span>Tất cả sản phẩm</span>
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
                  className="h-8 text-text-secondary hover:text-primary inline-flex items-center justify-center gap-1.5 leading-none whitespace-nowrap transition-colors duration-150 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {iconName}
                  </span>
                  <span>{cat.name}</span>
                </button>
              );
            })}

          </nav>
        </div>
      </header>
    </>
  );
};
