import React, { useEffect, useMemo, useState } from 'react';
import {
  Brand,
  Category,
  Order,
  Product,
  ProductLine,
  User,
} from '../../types/api';
import {
  brandsApi,
  categoriesApi,
  confirmDialog,
  formatVndPrice,
  getTotalStock,
  ordersApi,
  productLinesApi,
} from '../../services/api';
import { slugifyVi } from './AdminProductsSection';

// ================= 1. TỔNG QUAN VÀ THỐNG KÊ (/admin) =================
interface AdminOverviewProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  onNavigateSection: (path: string, productId?: string) => void;
}

export const AdminOverviewDashboard: React.FC<AdminOverviewProps> = ({
  products,
  categories,
  brands,
  onNavigateSection,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    ordersApi
      .getAllOrdersManage()
      .then((res) => {
        if (mounted) setOrders(Array.isArray(res) ? res : []);
      })
      .catch(() => {
        if (mounted) setOrders([]);
      })
      .finally(() => {
        if (mounted) setLoadingOrders(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const validOrders = orders.filter(
      (o) => o.orderStatus !== 'da_huy' && o.orderStatus !== 'cancelled',
    );
    const revenue = validOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const pendingOrders = orders.filter((o) => o.orderStatus === 'cho_xac_nhan').length;
    const totalSkus = products.reduce((s, p) => s + (p.variants?.length || 0), 0);
    const lowStockProducts = products.filter((p) => getTotalStock(p) <= 10);

    return {
      revenue,
      totalOrders: orders.length,
      pendingOrders,
      totalSkus,
      lowStockProducts,
    };
  }, [orders, products]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          Tổng quan và thống kê vận hành
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Bức tranh toàn cảnh về doanh thu, luồng đơn hàng, tồn kho SKU và danh mục kinh doanh tại TecoStore.
        </p>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Doanh thu đơn hợp lệ</span>
            <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">monitoring</span>
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">
            {formatVndPrice(stats.revenue)}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            • Tính trên các đơn không hủy
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Đơn hàng cần duyệt</span>
            <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{stats.pendingOrders}</div>
          <button
            type="button"
            onClick={() => onNavigateSection('/admin/orders')}
            className="text-[11px] text-blue-600 hover:underline font-bold mt-1 cursor-pointer"
          >
            Xử lý ngay trên tổng {stats.totalOrders} đơn →
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Sản phẩm &amp; Phiên bản SKU</span>
            <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">widgets</span>
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {products.length} SP <span className="text-sm text-slate-400 font-bold">/ {stats.totalSkus} SKU</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {categories.length} Danh mục • {brands.length} Thương hiệu
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Cảnh báo sắp hết kho</span>
            <span className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">warning</span>
            </span>
          </div>
          <div className="text-2xl font-black text-red-600 mt-2">
            {stats.lowStockProducts.length} SP
          </div>
          <button
            type="button"
            onClick={() => onNavigateSection('/admin/inventory')}
            className="text-[11px] text-blue-600 hover:underline font-bold mt-1 cursor-pointer"
          >
            Kiểm tra tồn kho SKU →
          </button>
        </div>
      </div>

      {/* Recent Orders + Low Stock Quick Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-sm text-slate-900">Đơn hàng phát sinh gần đây</h3>
            <button
              type="button"
              onClick={() => onNavigateSection('/admin/orders')}
              className="text-blue-600 hover:underline font-bold cursor-pointer"
            >
              Xem tất cả đơn →
            </button>
          </div>

          {loadingOrders ? (
            <div className="py-8 text-center text-slate-400">Đang tải đơn hàng...</div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center text-slate-400">Chưa có đơn hàng nào.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {orders.slice(0, 6).map((o) => (
                <div key={o._id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-blue-600">{o.orderCode}</span>
                    <span className="block text-[11px] text-slate-500">
                      {o.shippingAddress?.hoTenNguoiNhan || 'Khách hàng'} •{' '}
                      <strong className="uppercase">{o.paymentMethod}</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 block">
                      {formatVndPrice(o.totalAmount)}
                    </span>
                    <span className="text-[10px] text-slate-500">{o.orderStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-sm text-slate-900">
              Sản phẩm cần nhập thêm kho (≤ 10)
            </h3>
            <button
              type="button"
              onClick={() => onNavigateSection('/admin/variants')}
              className="text-blue-600 hover:underline font-bold cursor-pointer"
            >
              Quản lý SKU →
            </button>
          </div>

          {stats.lowStockProducts.length === 0 ? (
            <div className="py-8 text-center text-emerald-600 font-semibold">
              ✓ Toàn bộ sản phẩm đều dồi dào tồn kho!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.lowStockProducts.slice(0, 6).map((p) => (
                <div key={p._id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onNavigateSection('/admin/variants', p._id)}
                      className="font-bold text-slate-900 hover:text-blue-600 truncate block text-left cursor-pointer"
                    >
                      {p.name}
                    </button>
                    <span className="text-[11px] text-slate-400">
                      {p.variants?.length || 0} phiên bản SKU
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] flex-shrink-0">
                    Còn {getTotalStock(p)} chiếc
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ================= 2. QUẢN LÝ DANH MỤC (/admin/categories) =================
export const AdminCategoriesPage: React.FC<{
  categories: Category[];
  onRefreshCatalog: () => Promise<void>;
}> = ({ categories, onRefreshCatalog }) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [productType, setProductType] = useState('phone');
  const [parentId, setParentId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || slugifyVi(name),
        productType,
        ...(parentId ? { parentId } : {}),
      };
      if (editingId) {
        await categoriesApi.update(editingId, payload);
      } else {
        await categoriesApi.create(payload);
      }
      const savedName = name.trim();
      const wasEditing = Boolean(editingId);
      setName('');
      setSlug('');
      setParentId('');
      setEditingId(null);
      await onRefreshCatalog();
      alert(
        wasEditing
          ? `Đã cập nhật danh mục "${savedName}" thành công!`
          : `Đã thêm danh mục "${savedName}" thành công!`,
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lưu danh mục thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-xs">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Quản lý danh mục</h1>
        <p className="text-slate-500 mt-1">
          Tổ chức cây danh mục ngành hàng hiển thị trên thanh điều hướng và bộ lọc sản phẩm.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
      >
        <div>
          <label className="block font-bold text-slate-700 mb-1">Tên danh mục *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!editingId) setSlug(slugifyVi(e.target.value));
            }}
            placeholder="VD: Điện thoại thông minh"
            className="w-full h-10 px-3 rounded-xl border border-slate-200"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Slug *</label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="dien-thoai"
            className="w-full h-10 px-3 rounded-xl border border-slate-200 font-mono"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Loại ngành hàng</label>
          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white"
          >
            <option value="phone">Điện thoại (phone)</option>
            <option value="laptop">Laptop (laptop)</option>
            <option value="tablet">Máy tính bảng (tablet)</option>
            <option value="accessory">Phụ kiện (accessory)</option>
          </select>
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Danh mục cha</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white"
          >
            <option value="">-- Danh mục gốc --</option>
            {categories
              .filter((c) => c._id !== editingId)
              .map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
          >
            {editingId ? 'Cập nhật' : '+ Thêm danh mục'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setName('');
                setSlug('');
              }}
              className="px-3 h-10 rounded-xl bg-slate-100 font-bold cursor-pointer"
            >
              Hủy
            </button>
          )}
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-400">
              <th className="py-3.5 px-4">STT</th>
              <th className="py-3.5 px-4">Tên danh mục</th>
              <th className="py-3.5 px-4">Đường dẫn Slug</th>
              <th className="py-3.5 px-4">Nhóm ngành</th>
              <th className="py-3.5 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((c, idx) => (
              <tr key={c._id} className="hover:bg-slate-50/70">
                <td className="py-3.5 px-4 font-mono text-slate-400">
                  {String(idx + 1).padStart(2, '0')}
                </td>
                <td className="py-3.5 px-4 font-bold text-slate-900">{c.name}</td>
                <td className="py-3.5 px-4 font-mono text-blue-600">/{c.slug}</td>
                <td className="py-3.5 px-4 uppercase font-semibold text-slate-600">
                  {c.productType}
                </td>
                <td className="py-3.5 px-4 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(c._id);
                      setName(c.name);
                      setSlug(c.slug);
                      setProductType(c.productType);
                      setParentId(c.parentId || '');
                    }}
                    className="px-3 py-1 rounded-lg border border-slate-200 hover:border-blue-500 font-bold cursor-pointer"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        !(await confirmDialog(
                          `Bạn có chắc muốn xóa danh mục "${c.name}"?`,
                          'Xác nhận xóa danh mục',
                        ))
                      )
                        return;
                      try {
                        await categoriesApi.remove(c._id);
                        await onRefreshCatalog();
                        alert(`Đã xóa danh mục "${c.name}" thành công!`);
                      } catch (err: unknown) {
                        alert(err instanceof Error ? err.message : 'Xóa thất bại');
                      }
                    }}
                    className="px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold cursor-pointer"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ================= 3. QUẢN LÝ THƯƠNG HIỆU (/admin/brands) =================
export const AdminBrandsPage: React.FC<{
  brands: Brand[];
  onRefreshCatalog: () => Promise<void>;
}> = ({ brands, onRefreshCatalog }) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logo, setLogo] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || slugifyVi(name),
        ...(logo.trim() ? { logo: logo.trim() } : {}),
        status,
      };
      if (editingId) {
        await brandsApi.update(editingId, payload);
      } else {
        await brandsApi.create(payload);
      }
      const savedName = name.trim();
      const wasEditing = Boolean(editingId);
      setName('');
      setSlug('');
      setLogo('');
      setEditingId(null);
      await onRefreshCatalog();
      alert(
        wasEditing
          ? `Đã cập nhật thương hiệu "${savedName}" thành công!`
          : `Đã thêm thương hiệu "${savedName}" thành công!`,
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lưu thương hiệu thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-xs">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Quản lý thương hiệu</h1>
        <p className="text-slate-500 mt-1">
          Quản lý các hãng công nghệ đối tác (Apple, Samsung, ASUS, Dell, Sony...) và Logo nhận diện.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
      >
        <div>
          <label className="block font-bold text-slate-700 mb-1">Tên thương hiệu *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!editingId) setSlug(slugifyVi(e.target.value));
            }}
            placeholder="VD: Apple"
            className="w-full h-10 px-3 rounded-xl border border-slate-200"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Slug *</label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="apple"
            className="w-full h-10 px-3 rounded-xl border border-slate-200 font-mono"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">URL Logo (HTTPS)</label>
          <input
            type="url"
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            placeholder="https://..."
            className="w-full h-10 px-3 rounded-xl border border-slate-200"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Trạng thái</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white"
          >
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm ẩn</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
          >
            {editingId ? 'Cập nhật' : '+ Thêm hãng'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setName('');
                setSlug('');
                setLogo('');
              }}
              className="px-3 h-10 rounded-xl bg-slate-100 font-bold cursor-pointer"
            >
              Hủy
            </button>
          )}
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-400">
              <th className="py-3.5 px-4">STT</th>
              <th className="py-3.5 px-4">Thương hiệu</th>
              <th className="py-3.5 px-4">Slug</th>
              <th className="py-3.5 px-4">Trạng thái</th>
              <th className="py-3.5 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {brands.map((b, idx) => (
              <tr key={b._id} className="hover:bg-slate-50/70">
                <td className="py-3.5 px-4 font-mono text-slate-400">
                  {String(idx + 1).padStart(2, '0')}
                </td>
                <td className="py-3.5 px-4 font-bold text-slate-900">{b.name}</td>
                <td className="py-3.5 px-4 font-mono text-blue-600">/{b.slug}</td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      b.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {b.status === 'active' ? 'Đang hoạt động' : 'Tạm ẩn'}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(b._id);
                      setName(b.name);
                      setSlug(b.slug);
                      setLogo(b.logo || '');
                      setStatus(b.status);
                    }}
                    className="px-3 py-1 rounded-lg border border-slate-200 hover:border-blue-500 font-bold cursor-pointer"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        !(await confirmDialog(
                          `Bạn có chắc muốn xóa thương hiệu "${b.name}"?`,
                          'Xác nhận xóa thương hiệu',
                        ))
                      )
                        return;
                      try {
                        await brandsApi.remove(b._id);
                        await onRefreshCatalog();
                        alert(`Đã xóa thương hiệu "${b.name}" thành công!`);
                      } catch (err: unknown) {
                        alert(err instanceof Error ? err.message : 'Xóa thất bại');
                      }
                    }}
                    className="px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold cursor-pointer"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ================= 4. QUẢN LÝ DÒNG SẢN PHẨM / SERIES (/admin/product-lines) =================
export const AdminProductLinesPage: React.FC<{
  productLines: ProductLine[];
  brands: Brand[];
  categories: Category[];
  onRefreshCatalog: () => Promise<void>;
}> = ({ productLines, brands, categories, onRefreshCatalog }) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [brandId, setBrandId] = useState(brands[0]?._id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?._id || '');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBrand = brandId || brands[0]?._id;
    const targetCat = categoryId || categories[0]?._id;
    if (!name.trim() || !targetBrand || !targetCat) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || slugifyVi(name),
        brandId: targetBrand,
        categoryId: targetCat,
        status: 'active' as const,
      };
      if (editingId) {
        await productLinesApi.update(editingId, payload);
      } else {
        await productLinesApi.create(payload);
      }
      const savedName = name.trim();
      const wasEditing = Boolean(editingId);
      setName('');
      setSlug('');
      setEditingId(null);
      await onRefreshCatalog();
      alert(
        wasEditing
          ? `Đã cập nhật dòng sản phẩm "${savedName}" thành công!`
          : `Đã thêm dòng sản phẩm "${savedName}" thành công!`,
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lưu dòng sản phẩm thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-xs">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          Quản lý dòng sản phẩm (Series)
        </h1>
        <p className="text-slate-500 mt-1">
          Phân nhóm các dòng máy (VD: iPhone 16 Series, Galaxy S Series, MacBook Pro...) theo Thương hiệu và Danh mục.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
      >
        <div>
          <label className="block font-bold text-slate-700 mb-1">Tên dòng máy *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!editingId) setSlug(slugifyVi(e.target.value));
            }}
            placeholder="VD: iPhone 17 Series"
            className="w-full h-10 px-3 rounded-xl border border-slate-200"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Slug *</label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="iphone-17-series"
            className="w-full h-10 px-3 rounded-xl border border-slate-200 font-mono"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Thương hiệu *</label>
          <select
            value={brandId || brands[0]?._id || ''}
            onChange={(e) => setBrandId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white"
          >
            {brands.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Danh mục *</label>
          <select
            value={categoryId || categories[0]?._id || ''}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white"
          >
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
          >
            {editingId ? 'Cập nhật' : '+ Thêm Series'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setName('');
                setSlug('');
              }}
              className="px-3 h-10 rounded-xl bg-slate-100 font-bold cursor-pointer"
            >
              Hủy
            </button>
          )}
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-400">
              <th className="py-3.5 px-4">STT</th>
              <th className="py-3.5 px-4">Tên Series</th>
              <th className="py-3.5 px-4">Slug</th>
              <th className="py-3.5 px-4">Thương hiệu</th>
              <th className="py-3.5 px-4">Danh mục</th>
              <th className="py-3.5 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {productLines.map((pl, idx) => (
              <tr key={pl._id} className="hover:bg-slate-50/70">
                <td className="py-3.5 px-4 font-mono text-slate-400">
                  {String(idx + 1).padStart(2, '0')}
                </td>
                <td className="py-3.5 px-4 font-bold text-slate-900">{pl.name}</td>
                <td className="py-3.5 px-4 font-mono text-blue-600">/{pl.slug}</td>
                <td className="py-3.5 px-4 font-semibold">
                  {brands.find((b) => b._id === pl.brandId)?.name || '—'}
                </td>
                <td className="py-3.5 px-4 text-slate-600">
                  {categories.find((c) => c._id === pl.categoryId)?.name || '—'}
                </td>
                <td className="py-3.5 px-4 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(pl._id);
                      setName(pl.name);
                      setSlug(pl.slug);
                      setBrandId(pl.brandId);
                      setCategoryId(pl.categoryId);
                    }}
                    className="px-3 py-1 rounded-lg border border-slate-200 hover:border-blue-500 font-bold cursor-pointer"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        !(await confirmDialog(
                          `Bạn có chắc muốn xóa dòng máy "${pl.name}"?`,
                          'Xác nhận xóa dòng sản phẩm',
                        ))
                      )
                        return;
                      try {
                        await productLinesApi.remove(pl._id);
                        await onRefreshCatalog();
                        alert(`Đã xóa dòng sản phẩm "${pl.name}" thành công!`);
                      } catch (err: unknown) {
                        alert(err instanceof Error ? err.message : 'Xóa thất bại');
                      }
                    }}
                    className="px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold cursor-pointer"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ================= 5. NHÂN VIÊN VÀ PHÂN QUYỀN CASL PBAC (/admin/permissions) =================
export const AdminPermissionsPage: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const matrix = [
    {
      module: 'Sản phẩm & Biến thể SKU',
      admin: 'Toàn quyền (Tạo, Xem, Sửa, Xóa)',
      employee: 'Tạo mới & Cập nhật giá/kho (Không được xóa)',
      customer: 'Chỉ xem sản phẩm công khai',
    },
    {
      module: 'Danh mục • Thương hiệu • Series',
      admin: 'Toàn quyền CRUD',
      employee: 'Chỉ xem',
      customer: 'Chỉ xem',
    },
    {
      module: 'Đơn hàng & Vận đơn',
      admin: 'Xem toàn bộ & Chuyển trạng thái vận đơn',
      employee: 'Xem toàn bộ & Chuyển trạng thái vận đơn',
      customer: 'Tạo đơn, Xem đơn cá nhân, Hủy đơn COD chờ duyệt',
    },
    {
      module: 'Mã giảm giá (Voucher)',
      admin: 'Phát hành, Chỉnh sửa, Khóa/Mở Voucher',
      employee: 'Không có quyền quản trị',
      customer: 'Xem ví Voucher cá nhân & Kiểm tra áp dụng',
    },
    {
      module: 'Đánh giá & Bình luận',
      admin: 'Xem tất cả, Ẩn/Hiện kiểm duyệt, Phản hồi Shop',
      employee: 'Xem tất cả, Ẩn/Hiện kiểm duyệt, Phản hồi Shop',
      customer: 'Đánh giá SP đã nhận hàng, Sửa/Xóa đánh giá cá nhân',
    },
  ];

  return (
    <div className="space-y-5 text-xs">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          Nhân viên và Phân quyền hệ thống (CASL PBAC)
        </h1>
        <p className="text-slate-500 mt-1">
          Chính sách kiểm soát truy cập dựa trên thuộc tính và vai trò (Policy-Based Access Control) đang áp dụng tại Backend NestJS.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center">
            {(currentUser.fullName || currentUser.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-slate-900">
                {currentUser.fullName || 'Quản trị viên'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] uppercase">
                {currentUser.role === 'admin' ? 'Super Admin' : 'Operations Employee'}
              </span>
            </div>
            <p className="text-slate-500 mt-0.5">Email định danh: {currentUser.email}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold">
          <span className="material-symbols-outlined text-[16px]">verified_user</span>
          Phiên JWT + CASL Guard đang bảo vệ
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-400">
              <th className="py-3.5 px-4">Phân hệ nghiệp vụ</th>
              <th className="py-3.5 px-4">Super Admin (admin)</th>
              <th className="py-3.5 px-4">Nhân viên (employee)</th>
              <th className="py-3.5 px-4">Khách hàng (customer)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {matrix.map((row) => (
              <tr key={row.module} className="hover:bg-slate-50/70">
                <td className="py-3.5 px-4 font-bold text-slate-900">{row.module}</td>
                <td className="py-3.5 px-4 text-emerald-700 font-semibold">{row.admin}</td>
                <td className="py-3.5 px-4 text-blue-700 font-medium">{row.employee}</td>
                <td className="py-3.5 px-4 text-slate-600">{row.customer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
