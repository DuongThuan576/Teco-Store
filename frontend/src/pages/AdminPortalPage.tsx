import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Brand, Category, Product, ProductLine, User } from '../types/api';
import { authApi } from '../services/api';
import { AdminOrdersSection } from '../components/admin/AdminOrdersSection';
import { AdminProductsSection } from '../components/admin/AdminProductsSection';
import { AdminVouchersSection } from '../components/admin/AdminVouchersSection';
import { AdminReviewsModerationSection } from '../components/admin/AdminReviewsAndCatalogSection';
import {
  AdminInventoryPage,
  AdminVariantsPage,
} from '../components/admin/AdminVariantsAndInventorySection';
import {
  AdminBrandsPage,
  AdminCategoriesPage,
  AdminOverviewDashboard,
  AdminPermissionsPage,
  AdminProductLinesPage,
} from '../components/admin/AdminDashboardAndSystemSection';

interface AdminPortalPageProps {
  currentUser: User | null;
  loadingAuth?: boolean;
  products: Product[];
  categories: Category[];
  brands: Brand[];
  productLines: ProductLine[];
  onRefreshCatalog: () => Promise<void>;
  onLogoutSuccess: () => void;
}

interface SidebarMenuItem {
  path: string;
  label: string;
  icon: string;
  group?: string;
  adminOnly?: boolean;
}

const SIDEBAR_ITEMS: SidebarMenuItem[] = [
  {
    path: '/admin',
    label: 'Tổng quan và thống kê',
    icon: 'dashboard',
    group: 'Tổng quan',
  },
  // SẢN PHẨM & KHO HÀNG
  {
    path: '/admin/categories',
    label: 'Quản lý danh mục',
    icon: 'category',
    group: 'Sản phẩm và kho hàng',
    adminOnly: true,
  },
  {
    path: '/admin/brands',
    label: 'Quản lý thương hiệu',
    icon: 'verified',
    group: 'Sản phẩm và kho hàng',
    adminOnly: true,
  },
  {
    path: '/admin/product-lines',
    label: 'Quản lý dòng sản phẩm',
    icon: 'devices_other',
    group: 'Sản phẩm và kho hàng',
    adminOnly: true,
  },
  {
    path: '/admin/products',
    label: 'Danh sách sản phẩm',
    icon: 'inventory_2',
    group: 'Sản phẩm và kho hàng',
  },
  {
    path: '/admin/variants',
    label: 'Quản lý phiên bản sản phẩm',
    icon: 'tune',
    group: 'Sản phẩm và kho hàng',
  },
  {
    path: '/admin/inventory',
    label: 'Quản lý tồn kho',
    icon: 'warehouse',
    group: 'Sản phẩm và kho hàng',
  },
  // BÁN HÀNG & KHÁCH HÀNG
  {
    path: '/admin/orders',
    label: 'Quản lý đơn hàng',
    icon: 'shopping_cart',
    group: 'Bán hàng và khách hàng',
  },
  {
    path: '/admin/vouchers',
    label: 'Quản lý mã giảm giá',
    icon: 'sell',
    group: 'Bán hàng và khách hàng',
    adminOnly: true,
  },
  {
    path: '/admin/reviews',
    label: 'Quản lý đánh giá sản phẩm',
    icon: 'star',
    group: 'Bán hàng và khách hàng',
  },
  // HỆ THỐNG
  {
    path: '/admin/permissions',
    label: 'Nhân viên và phân quyền',
    icon: 'admin_panel_settings',
    group: 'Hệ thống',
  },
];

export const AdminPortalPage: React.FC<AdminPortalPageProps> = ({
  currentUser,
  loadingAuth = false,
  products,
  categories,
  brands,
  productLines,
  onRefreshCatalog,
  onLogoutSuccess,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [focusedVariantProductId, setFocusedVariantProductId] = useState<string | undefined>(
    undefined,
  );
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  // Normalize path
  const currentPath =
    location.pathname.endsWith('/') && location.pathname !== '/admin'
      ? location.pathname.slice(0, -1)
      : location.pathname;

  const isAdmin = currentUser?.role === 'admin';
  const isStaff =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'employee' ||
    currentUser?.role === 'staff';

  // Quick search suggestions across products & SKUs
  const quickSearchMatches = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.variants?.some((v) => v.sku.toLowerCase().includes(q)),
      )
      .slice(0, 6);
  }, [globalSearch, products]);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#F4F7FE] flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="material-symbols-outlined text-[36px] text-blue-600 animate-spin">
            progress_activity
          </span>
          <p className="text-xs font-bold text-slate-600">
            Đang khởi tạo không gian quản trị TecoStore Enterprise Admin...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F4F7FE] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-8 text-center shadow-lg space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md">
            <span className="material-symbols-outlined text-[30px]">admin_panel_settings</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">TecoStore Enterprise Admin</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Vui lòng đăng nhập bằng tài khoản <strong>Quản trị viên (Admin)</strong> hoặc{' '}
            <strong>Nhân viên vận hành (Employee)</strong> để truy cập hệ thống quản trị.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={() => navigate('/login', { state: { from: currentPath } })}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm"
            >
              Đăng nhập Hệ thống Quản trị
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              Quay về trang chủ bán hàng
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-[#F4F7FE] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-8 text-center shadow-lg space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[32px]">gpp_bad</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Không có quyền truy cập (CASL PBAC)
          </h2>
          <p className="text-xs text-slate-500">
            Tài khoản <strong>{currentUser.email}</strong> hiện đang mang vai trò Khách hàng nên không thể vào khu vực quản trị nội bộ.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-3 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Quay về Trang chủ TecoStore
          </button>
        </div>
      </div>
    );
  }

  const visibleItems = SIDEBAR_ITEMS.filter((it) => !it.adminOnly || isAdmin);
  const activeItem =
    visibleItems.find((it) => it.path === currentPath) || visibleItems[0];

  const handleNavigateAdmin = (path: string, productId?: string) => {
    if (productId) {
      setFocusedVariantProductId(productId);
    }
    setMobileSidebarOpen(false);
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors
    } finally {
      onLogoutSuccess();
      navigate('/login');
    }
  };

  const renderSidebarGroup = (groupTitle: string | null, items: SidebarMenuItem[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        {groupTitle && (
          <div className="px-3 pt-4 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            {groupTitle}
          </div>
        )}
        {items.map((item) => {
          const active = activeItem.path === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNavigateAdmin(item.path)}
              className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-xs transition-all cursor-pointer text-left ${
                active
                  ? 'bg-blue-50 text-blue-600 font-extrabold shadow-2xs'
                  : 'text-slate-600 font-semibold hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[19px] ${
                  active ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const overviewItems = visibleItems.filter((i) => i.group === 'Tổng quan');
  const catalogItems = visibleItems.filter((i) => i.group === 'Sản phẩm và kho hàng');
  const salesItems = visibleItems.filter((i) => i.group === 'Bán hàng và khách hàng');
  const systemItems = visibleItems.filter((i) => i.group === 'Hệ thống');

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-slate-900 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ================= LEFT ENTERPRISE SIDEBAR ================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[264px] bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Brand + Scrollable Menu */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo Header */}
          <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <button
              type="button"
              onClick={() => handleNavigateAdmin('/admin')}
              className="flex items-center gap-3 cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-[20px]">storefront</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold text-slate-900 tracking-tight">
                    TecoStore
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-extrabold text-[9px] uppercase border border-blue-200">
                    PRO
                  </span>
                </div>
                <span className="block text-[10px] font-semibold text-slate-400 -mt-0.5">
                  Enterprise Admin
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-700 p-1"
            >
              ✕
            </button>
          </div>

          {/* Navigation Groups */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {renderSidebarGroup(null, overviewItems)}
            {renderSidebarGroup('Sản phẩm & Kho hàng', catalogItems)}
            {renderSidebarGroup('Bán hàng & Khách hàng', salesItems)}
            {renderSidebarGroup('Hệ thống', systemItems)}
          </nav>
        </div>

        {/* Bottom Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 space-y-1 bg-white flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-3 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[19px] text-slate-400">
              storefront
            </span>
            <span>Quay về trang chủ</span>
          </button>

          <button
            type="button"
            onClick={() => void handleAdminLogout()}
            className="w-full px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[19px]">logout</span>
            <span>Đăng xuất quản trị</span>
          </button>
        </div>
      </aside>

      {/* ================= RIGHT WORKSPACE AREA ================= */}
      <div className="flex-1 lg:pl-[264px] flex flex-col min-h-screen min-w-0">
        {/* Sticky Top Admin Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>

            {/* Global Quick Search */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">
                search
              </span>
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Tìm kiếm nhanh sản phẩm, SKU, đơn hàng..."
                className="w-full h-10 pl-10 pr-12 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
              />
              <span className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-200/70 text-[10px] font-mono text-slate-500">
                ⌘K
              </span>

              {/* Quick Jump Dropdown */}
              {quickSearchMatches.length > 0 && (
                <div className="absolute left-0 right-0 top-12 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 space-y-1 text-xs">
                  {quickSearchMatches.map((prod) => (
                    <button
                      key={prod._id}
                      type="button"
                      onClick={() => {
                        setGlobalSearch('');
                        handleNavigateAdmin('/admin/variants', prod._id);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-blue-50 flex items-center justify-between text-left cursor-pointer"
                    >
                      <span className="font-bold text-slate-800 truncate">{prod.name}</span>
                      <span className="text-[11px] font-mono text-blue-600 flex-shrink-0 ml-2">
                        {prod.variants?.length || 0} SKU →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => handleNavigateAdmin('/admin/orders')}
              title="Kiểm tra đơn hàng"
              className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 relative cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2" />
            </button>

            <button
              type="button"
              onClick={() => handleNavigateAdmin('/admin/products')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Tạo mới</span>
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* Admin Profile Badge */}
            <button
              type="button"
              onClick={() => handleNavigateAdmin('/admin/permissions')}
              className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-50 cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
                {(currentUser.fullName || currentUser.fullname || currentUser.email)
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div className="hidden md:block leading-tight">
                <span className="text-xs font-extrabold text-slate-900 block max-w-[140px] truncate">
                  {currentUser.fullName || currentUser.fullname || 'Quản trị viên'}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 block">
                  {isAdmin ? 'Admin' : 'Staff Operations'}
                </span>
              </div>
            </button>
          </div>
        </header>

        {/* Breadcrumb Strip + Active Content */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-[1440px] w-full mx-auto space-y-5">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium flex-wrap">
            <button
              type="button"
              onClick={() => handleNavigateAdmin('/admin')}
              className="hover:text-blue-600 cursor-pointer"
            >
              Hệ thống quản trị
            </button>
            {activeItem.group && (
              <>
                <span>›</span>
                <span>{activeItem.group}</span>
              </>
            )}
            <span>›</span>
            <span className="text-slate-800 font-bold">{activeItem.label}</span>
          </nav>

          {/* Dynamic Workspace View */}
          {activeItem.path === '/admin' && (
            <AdminOverviewDashboard
              products={products}
              categories={categories}
              brands={brands}
              onNavigateSection={handleNavigateAdmin}
            />
          )}

          {activeItem.path === '/admin/categories' && isAdmin && (
            <AdminCategoriesPage
              categories={categories}
              onRefreshCatalog={onRefreshCatalog}
            />
          )}

          {activeItem.path === '/admin/brands' && isAdmin && (
            <AdminBrandsPage brands={brands} onRefreshCatalog={onRefreshCatalog} />
          )}

          {activeItem.path === '/admin/product-lines' && isAdmin && (
            <AdminProductLinesPage
              productLines={productLines}
              brands={brands}
              categories={categories}
              onRefreshCatalog={onRefreshCatalog}
            />
          )}

          {activeItem.path === '/admin/products' && (
            <AdminProductsSection
              products={products}
              categories={categories}
              brands={brands}
              productLines={productLines}
              isAdmin={Boolean(isAdmin)}
              initialEditProduct={productToEdit}
              onClearInitialEdit={() => setProductToEdit(null)}
              onOpenVariantsPage={(prodId) => handleNavigateAdmin('/admin/variants', prodId)}
              onRefreshCatalog={onRefreshCatalog}
            />
          )}

          {activeItem.path === '/admin/variants' && (
            <AdminVariantsPage
              products={products}
              categories={categories}
              brands={brands}
              productLines={productLines}
              isAdmin={Boolean(isAdmin)}
              initialProductId={focusedVariantProductId}
              onEditParentProduct={(prod) => {
                setProductToEdit(prod);
                handleNavigateAdmin('/admin/products');
              }}
              onRefreshCatalog={onRefreshCatalog}
            />
          )}

          {activeItem.path === '/admin/inventory' && (
            <AdminInventoryPage
              products={products}
              categories={categories}
              brands={brands}
              onOpenProductVariants={(prodId) => handleNavigateAdmin('/admin/variants', prodId)}
              onRefreshCatalog={onRefreshCatalog}
            />
          )}

          {activeItem.path === '/admin/orders' && <AdminOrdersSection />}

          {activeItem.path === '/admin/vouchers' && isAdmin && <AdminVouchersSection />}

          {activeItem.path === '/admin/reviews' && (
            <AdminReviewsModerationSection products={products} />
          )}

          {activeItem.path === '/admin/permissions' && (
            <AdminPermissionsPage currentUser={currentUser} />
          )}
        </main>
      </div>
    </div>
  );
};
