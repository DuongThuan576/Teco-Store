import React, { useMemo, useState } from 'react';
import {
  Brand,
  Category,
  CreateProductDTO,
  Product,
  ProductLine,
  ProductVariant,
} from '../../types/api';
import {
  confirmDialog,
  formatVndPrice,
  getPrimaryVariant,
  getProductImage,
  getTotalStock,
  productsApi,
} from '../../services/api';

interface AdminProductsSectionProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  productLines: ProductLine[];
  isAdmin: boolean;
  initialEditProduct?: Product | null;
  onClearInitialEdit?: () => void;
  onOpenVariantsPage?: (productId: string) => void;
  onRefreshCatalog: () => Promise<void>;
}

export function slugifyVi(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export const AdminProductsSection: React.FC<AdminProductsSectionProps> = ({
  products,
  categories,
  brands,
  productLines,
  isAdmin,
  initialEditProduct,
  onClearInitialEdit,
  onOpenVariantsPage,
  onRefreshCatalog,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'inactive'>('all');

  // Product Form Modal (Create / Edit)
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [brandId, setBrandId] = useState<string>('');
  const [productLineId, setProductLineId] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [specCpu, setSpecCpu] = useState<string>('');
  const [specRam, setSpecRam] = useState<string>('');
  const [specScreen, setSpecScreen] = useState<string>('');

  // Initial Variant fields (only for creating a brand-new product)
  const [initSku, setInitSku] = useState<string>('');
  const [initColor, setInitColor] = useState<string>(' Đen Titan');
  const [initStorage, setInitStorage] = useState<string>('256GB');
  const [initPrice, setInitPrice] = useState<number>(19990000);
  const [initStock, setInitStock] = useState<number>(20);
  const [savingProduct, setSavingProduct] = useState<boolean>(false);
  const [productFormError, setProductFormError] = useState<string | null>(null);

  // Variants & Inventory Manager Modal
  const [managingVariantsProduct, setManagingVariantsProduct] = useState<Product | null>(null);
  const [variantDrafts, setVariantDrafts] = useState<
    Record<string, { price: number; stock: number; color: string; storage: string }>
  >({});
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);

  // New Variant Form inside Variants Modal
  const [newVarSku, setNewVarSku] = useState<string>('');
  const [newVarColor, setNewVarColor] = useState<string>('');
  const [newVarStorage, setNewVarStorage] = useState<string>('');
  const [newVarPrice, setNewVarPrice] = useState<number>(0);
  const [newVarStock, setNewVarStock] = useState<number>(10);
  const [newVarImage, setNewVarImage] = useState<string>('');
  const [addingVariant, setAddingVariant] = useState<boolean>(false);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const totalStock = getTotalStock(p);
      if (stockFilter === 'low' && totalStock > 5) return false;
      if (stockFilter === 'inactive' && p.isActive) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.variants?.some((v) => v.sku.toLowerCase().includes(q))
      );
    });
  }, [products, searchQuery, stockFilter]);

  const lowStockCount = useMemo(
    () => products.filter((p) => getTotalStock(p) <= 5).length,
    [products],
  );

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setSlug('');
    setDescription('');
    setCategoryId(categories[0]?._id || '');
    setBrandId(brands[0]?._id || '');
    setProductLineId('');
    setImageUrl('');
    setIsActive(true);
    setSpecCpu('');
    setSpecRam('');
    setSpecScreen('');
    setInitSku('');
    setInitColor('Đen');
    setInitStorage('256GB');
    setInitPrice(15990000);
    setInitStock(15);
    setProductFormError(null);
    setShowProductModal(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setSlug(prod.slug);
    setDescription(prod.description || '');
    setCategoryId(prod.categoryId || '');
    setBrandId(prod.brandId || '');
    setProductLineId(prod.productLineId || '');
    setImageUrl(prod.images?.[0] || '');
    setIsActive(prod.isActive);
    setSpecCpu(String(prod.specifications?.cpu || ''));
    setSpecRam(String(prod.specifications?.ram || ''));
    setSpecScreen(String(prod.specifications?.screenSize || ''));
    setProductFormError(null);
    setShowProductModal(true);
  };

  React.useEffect(() => {
    if (initialEditProduct) {
      openEditModal(initialEditProduct);
      onClearInitialEdit?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEditProduct]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormError(null);

    const finalSlug = slug.trim() || slugifyVi(name);
    if (!name.trim() || !finalSlug) {
      setProductFormError('Tên sản phẩm và đường dẫn (slug) không được để trống.');
      return;
    }

    const specs: Record<string, unknown> = {
      ...(editingProduct?.specifications || {}),
    };
    if (specCpu.trim()) specs.cpu = specCpu.trim();
    if (specRam.trim()) specs.ram = specRam.trim();
    if (specScreen.trim()) specs.screenSize = specScreen.trim();

    const imagesArr = imageUrl.trim() ? [imageUrl.trim()] : undefined;

    setSavingProduct(true);
    try {
      if (editingProduct) {
        await productsApi.update(editingProduct._id, {
          name: name.trim(),
          slug: finalSlug,
          description: description.trim() || undefined,
          images: imagesArr,
          isActive,
          ...(categoryId ? { categoryId } : {}),
          ...(brandId ? { brandId } : {}),
          ...(productLineId ? { productLineId } : {}),
          ...(Object.keys(specs).length > 0 ? { specifications: specs } : {}),
        });
      } else {
        const skuVal =
          initSku.trim().toUpperCase() ||
          `${finalSlug.toUpperCase().slice(0, 12)}-${Date.now().toString().slice(-4)}`;
        const createDto: CreateProductDTO = {
          name: name.trim(),
          slug: finalSlug,
          description: description.trim() || undefined,
          images: imagesArr,
          isActive,
          ...(categoryId ? { categoryId } : {}),
          ...(brandId ? { brandId } : {}),
          ...(productLineId ? { productLineId } : {}),
          ...(Object.keys(specs).length > 0 ? { specifications: specs } : {}),
          variants: [
            {
              sku: skuVal,
              color: initColor.trim() || undefined,
              storage: initStorage.trim() || undefined,
              images: imagesArr,
              price: Number(initPrice),
              stock: Number(initStock),
            },
          ],
        };
        await productsApi.create(createDto);
      }

      setShowProductModal(false);
      await onRefreshCatalog();
      alert(
        editingProduct
          ? `Đã cập nhật sản phẩm "${name.trim()}" thành công!`
          : `Đã thêm sản phẩm mới "${name.trim()}" thành công!`,
      );
    } catch (err: unknown) {
      setProductFormError(err instanceof Error ? err.message : 'Lưu sản phẩm thất bại.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleActive = async (prod: Product) => {
    try {
      await productsApi.update(prod._id, { isActive: !prod.isActive });
      await onRefreshCatalog();
      alert(
        !prod.isActive
          ? `Đã mở bán lại sản phẩm "${prod.name}".`
          : `Đã tạm ẩn sản phẩm "${prod.name}".`,
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể đổi trạng thái sản phẩm');
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    if (
      !(await confirmDialog(
        `Xóa vĩnh viễn sản phẩm "${prod.name}"?\nHành động này không thể hoàn tác.`,
        'Xác nhận xóa sản phẩm',
      ))
    ) {
      return;
    }
    try {
      await productsApi.remove(prod._id);
      await onRefreshCatalog();
      alert(`Đã xóa sản phẩm "${prod.name}" thành công!`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xóa sản phẩm thất bại');
    }
  };

  // Variants Modal Helpers
  const openVariantsManager = (prod: Product) => {
    setManagingVariantsProduct(prod);
    const drafts: Record<
      string,
      { price: number; stock: number; color: string; storage: string }
    > = {};
    for (const v of prod.variants || []) {
      const key = v._id || v.sku;
      drafts[key] = {
        price: v.price,
        stock: v.stock,
        color: v.color || '',
        storage: v.storage || '',
      };
    }
    setVariantDrafts(drafts);
    setNewVarSku('');
    setNewVarColor('');
    setNewVarStorage('');
    setNewVarPrice(getPrimaryVariant(prod)?.price || 10000000);
    setNewVarStock(10);
    setNewVarImage('');
  };

  const refreshManagedProduct = async (productId: string) => {
    await onRefreshCatalog();
    try {
      const fresh = await productsApi.findOne(productId);
      openVariantsManager(fresh);
    } catch {
      setManagingVariantsProduct(null);
    }
  };

  const handleUpdateVariant = async (prod: Product, v: ProductVariant) => {
    if (!v._id) {
      alert('Không tìm thấy Variant ID');
      return;
    }
    const draft = variantDrafts[v._id];
    if (!draft) return;

    setSavingVariantId(v._id);
    try {
      await productsApi.updateVariant(prod._id, v._id, {
        price: Number(draft.price),
        stock: Number(draft.stock),
        color: draft.color.trim() || undefined,
        storage: draft.storage.trim() || undefined,
      });
      await refreshManagedProduct(prod._id);
      alert(`Đã cập nhật phiên bản SKU "${v.sku}" thành công!`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Cập nhật biến thể thất bại');
    } finally {
      setSavingVariantId(null);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingVariantsProduct) return;
    if (!newVarSku.trim()) {
      alert('Vui lòng nhập mã SKU cho biến thể mới.');
      return;
    }

    setAddingVariant(true);
    try {
      const createdSku = newVarSku.trim().toUpperCase();
      await productsApi.addVariant(managingVariantsProduct._id, {
        sku: createdSku,
        color: newVarColor.trim() || undefined,
        storage: newVarStorage.trim() || undefined,
        price: Number(newVarPrice),
        stock: Number(newVarStock),
        ...(newVarImage.trim() ? { images: [newVarImage.trim()] } : {}),
      });
      await refreshManagedProduct(managingVariantsProduct._id);
      alert(`Đã thêm phiên bản SKU "${createdSku}" thành công!`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Thêm biến thể SKU thất bại');
    } finally {
      setAddingVariant(false);
    }
  };

  const handleDeleteVariant = async (prod: Product, v: ProductVariant) => {
    if (!v._id) return;
    if (
      !(await confirmDialog(
        `Xóa biến thể SKU "${v.sku}" khỏi sản phẩm "${prod.name}"?`,
        'Xác nhận xóa biến thể SKU',
      ))
    )
      return;

    setSavingVariantId(v._id);
    try {
      await productsApi.removeVariant(prod._id, v._id);
      await refreshManagedProduct(prod._id);
      alert(`Đã xóa phiên bản SKU "${v.sku}" thành công!`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xóa biến thể thất bại');
    } finally {
      setSavingVariantId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
          <div>
            <h3 className="text-base font-extrabold text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">
                inventory_2
              </span>
              Quản lý Sản phẩm &amp; Tồn kho Biến thể SKU ({filteredProducts.length})
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Cập nhật thông tin sản phẩm, thêm cấu hình dung lượng/màu sắc và điều chỉnh tồn kho tức thì
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-primary hover:bg-surface-tint text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
            <span>Thêm sản phẩm mới</span>
          </button>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`px-3.5 py-1.5 rounded-full font-bold border cursor-pointer ${
                stockFilter === 'all'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-slate-50 text-text-secondary border-border-subtle'
              }`}
            >
              Tất cả ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('low')}
              className={`px-3.5 py-1.5 rounded-full font-bold border cursor-pointer ${
                stockFilter === 'low'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              Sắp hết hàng ≤ 5 ({lowStockCount})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('inactive')}
              className={`px-3.5 py-1.5 rounded-full font-bold border cursor-pointer ${
                stockFilter === 'inactive'
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-slate-50 text-text-secondary border-border-subtle'
              }`}
            >
              Đang ẩn / Ngừng bán
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined text-[18px] text-text-secondary absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên SP, slug hoặc SKU..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-border-subtle focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-subtle bg-slate-50/80 text-text-secondary">
                <th className="py-3 px-3 font-bold">Sản phẩm</th>
                <th className="py-3 px-3 font-bold">Danh mục / Hãng</th>
                <th className="py-3 px-3 font-bold">Giá đại diện</th>
                <th className="py-3 px-3 font-bold">Biến thể &amp; Tồn kho</th>
                <th className="py-3 px-3 font-bold">Trạng thái</th>
                <th className="py-3 px-3 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredProducts.slice(0, 50).map((prod, idx) => {
                const catName =
                  categories.find((c) => c._id === prod.categoryId)?.name || '—';
                const brandName =
                  brands.find((b) => b._id === prod.brandId)?.name || '—';
                const primary = getPrimaryVariant(prod);
                const totalStock = getTotalStock(prod);

                return (
                  <tr key={prod._id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={getProductImage(prod, idx)}
                          alt={prod.name}
                          className="w-11 h-11 rounded-lg border border-border-subtle object-contain p-1 bg-white flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-text-primary truncate max-w-[230px]">
                            {prod.name}
                          </div>
                          <div className="text-[11px] font-mono text-text-secondary truncate max-w-[230px]">
                            /{prod.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-text-primary">{catName}</div>
                      <div className="text-[11px] text-text-secondary">{brandName}</div>
                    </td>
                    <td className="py-3 px-3 font-extrabold text-badge-discount">
                      {formatVndPrice(primary?.price)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-text-primary">
                        {prod.variants?.length || 0} SKU
                      </span>
                      <span
                        className={`block text-[11px] font-semibold ${
                          totalStock <= 5 ? 'text-badge-discount' : 'text-emerald-600'
                        }`}
                      >
                        Tổng kho: {totalStock}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(prod)}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer border ${
                          prod.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {prod.isActive ? 'Đang bán' : 'Đã ẩn'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenVariantsPage
                              ? onOpenVariantsPage(prod._id)
                              : openVariantsManager(prod)
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold cursor-pointer"
                        >
                          Phiên bản SKU
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(prod)}
                          className="px-2.5 py-1.5 rounded-lg border border-border-subtle bg-white hover:bg-slate-50 font-bold cursor-pointer"
                        >
                          Sửa
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteProduct(prod)}
                            className="px-2.5 py-1.5 rounded-lg border border-red-200 text-badge-discount hover:bg-red-50 font-bold cursor-pointer"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= CREATE / EDIT PRODUCT MODAL ================= */}
      {showProductModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowProductModal(false)}
        >
          <form
            onSubmit={handleSaveProduct}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-border-subtle rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <h4 className="text-base font-extrabold text-text-primary">
                {editingProduct ? `Chỉnh sửa: ${editingProduct.name}` : 'Thêm sản phẩm công nghệ mới'}
              </h4>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {productFormError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-badge-discount font-semibold">
                {productFormError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1">
                  Tên sản phẩm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingProduct) {
                      setSlug(slugifyVi(e.target.value));
                    }
                  }}
                  placeholder="VD: iPhone 17 Pro Max"
                  className="w-full h-10 px-3 rounded-xl border border-border-subtle focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">
                  Đường dẫn Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="iphone-17-pro-max"
                  className="w-full h-10 px-3 rounded-xl border border-border-subtle font-mono focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Danh mục</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-white"
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Thương hiệu</label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-white"
                >
                  <option value="">-- Chọn hãng --</option>
                  {brands.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Dòng máy / Series</label>
                <select
                  value={productLineId}
                  onChange={(e) => setProductLineId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-white"
                >
                  <option value="">-- Không chọn --</option>
                  {productLines
                    .filter((pl) => !brandId || pl.brandId === brandId)
                    .map((pl) => (
                      <option key={pl._id} value={pl._id}>
                        {pl.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">URL Ảnh đại diện sản phẩm (HTTPS)</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full h-10 px-3 rounded-xl border border-border-subtle focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Chip CPU</label>
                <input
                  type="text"
                  value={specCpu}
                  onChange={(e) => setSpecCpu(e.target.value)}
                  placeholder="Apple A19 Pro / M4..."
                  className="w-full h-9 px-3 rounded-xl border border-border-subtle"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Dung lượng RAM</label>
                <input
                  type="text"
                  value={specRam}
                  onChange={(e) => setSpecRam(e.target.value)}
                  placeholder="12GB / 16GB..."
                  className="w-full h-9 px-3 rounded-xl border border-border-subtle"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Màn hình</label>
                <input
                  type="text"
                  value={specScreen}
                  onChange={(e) => setSpecScreen(e.target.value)}
                  placeholder="6.9 inch OLED 120Hz"
                  className="w-full h-9 px-3 rounded-xl border border-border-subtle"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Mô tả chi tiết</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả đặc điểm nổi bật của sản phẩm..."
                className="w-full p-3 rounded-xl border border-border-subtle"
              />
            </div>

            {/* Initial Variant Block (Required by CreateProductDTO when creating) */}
            {!editingProduct && (
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-primary/25 space-y-3">
                <span className="font-extrabold text-primary block">
                  Biến thể mở bán đầu tiên (Bắt buộc ít nhất 1 SKU)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block font-bold mb-1">Mã SKU *</label>
                    <input
                      type="text"
                      required
                      value={initSku}
                      onChange={(e) => setInitSku(e.target.value)}
                      placeholder="IP17-256-BLK"
                      className="w-full h-9 px-2.5 rounded-lg border border-border-subtle bg-white uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Màu sắc</label>
                    <input
                      type="text"
                      value={initColor}
                      onChange={(e) => setInitColor(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-border-subtle bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Bộ nhớ</label>
                    <input
                      type="text"
                      value={initStorage}
                      onChange={(e) => setInitStorage(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-border-subtle bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Giá bán (₫) *</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={initPrice}
                      onChange={(e) => setInitPrice(Number(e.target.value))}
                      className="w-full h-9 px-2.5 rounded-lg border border-border-subtle bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Tồn kho *</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={initStock}
                      onChange={(e) => setInitStock(Number(e.target.value))}
                      className="w-full h-9 px-2.5 rounded-lg border border-border-subtle bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-primary"
                />
                <span>Kích hoạt mở bán công khai</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-surface-tint text-white font-bold cursor-pointer"
                >
                  {savingProduct ? 'Đang lưu...' : editingProduct ? 'Lưu cập nhật' : 'Tạo sản phẩm'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ================= VARIANT & STOCK MANAGER MODAL ================= */}
      {managingVariantsProduct && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setManagingVariantsProduct(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-border-subtle rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div>
                <h4 className="text-base font-extrabold text-text-primary">
                  Quản lý Biến thể SKU &amp; Kho: {managingVariantsProduct.name}
                </h4>
                <p className="text-text-secondary mt-0.5">
                  Chỉnh sửa trực tiếp giá bán, số lượng tồn kho hoặc thêm phân loại mới
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManagingVariantsProduct(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Existing Variants List */}
            <div className="space-y-2.5">
              {(managingVariantsProduct.variants || []).map((v) => {
                const key = v._id || v.sku;
                const draft = variantDrafts[key] || {
                  price: v.price,
                  stock: v.stock,
                  color: v.color || '',
                  storage: v.storage || '',
                };

                return (
                  <div
                    key={key}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-border-subtle grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                  >
                    <div className="sm:col-span-3">
                      <span className="font-mono font-extrabold text-primary block">{v.sku}</span>
                      <span className="text-[10px] text-text-secondary">ID: {v._id?.slice(-6)}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-text-secondary block">Màu sắc</label>
                      <input
                        type="text"
                        value={draft.color}
                        onChange={(e) =>
                          setVariantDrafts((prev) => ({
                            ...prev,
                            [key]: { ...draft, color: e.target.value },
                          }))
                        }
                        className="w-full h-8 px-2 rounded-lg border border-border-subtle bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-text-secondary block">Dung lượng</label>
                      <input
                        type="text"
                        value={draft.storage}
                        onChange={(e) =>
                          setVariantDrafts((prev) => ({
                            ...prev,
                            [key]: { ...draft, storage: e.target.value },
                          }))
                        }
                        className="w-full h-8 px-2 rounded-lg border border-border-subtle bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-text-secondary block">Giá bán (₫)</label>
                      <input
                        type="number"
                        min={0}
                        value={draft.price}
                        onChange={(e) =>
                          setVariantDrafts((prev) => ({
                            ...prev,
                            [key]: { ...draft, price: Number(e.target.value) },
                          }))
                        }
                        className="w-full h-8 px-2 rounded-lg border border-border-subtle bg-white font-bold"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="text-[10px] text-text-secondary block">Kho</label>
                      <input
                        type="number"
                        min={0}
                        value={draft.stock}
                        onChange={(e) =>
                          setVariantDrafts((prev) => ({
                            ...prev,
                            [key]: { ...draft, stock: Number(e.target.value) },
                          }))
                        }
                        className="w-full h-8 px-2 rounded-lg border border-border-subtle bg-white font-bold"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-end justify-end gap-1.5 pt-3 sm:pt-0">
                      <button
                        type="button"
                        disabled={savingVariantId === v._id}
                        onClick={() => void handleUpdateVariant(managingVariantsProduct, v)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-white font-bold cursor-pointer"
                      >
                        {savingVariantId === v._id ? '...' : 'Lưu'}
                      </button>
                      {isAdmin && (managingVariantsProduct.variants?.length || 0) > 1 && (
                        <button
                          type="button"
                          disabled={savingVariantId === v._id}
                          onClick={() => void handleDeleteVariant(managingVariantsProduct, v)}
                          className="px-2.5 py-1.5 rounded-lg border border-red-200 text-badge-discount hover:bg-red-50 font-bold cursor-pointer"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add New Variant Form */}
            <form
              onSubmit={handleAddVariant}
              className="p-4 rounded-2xl bg-blue-50/40 border border-primary/25 space-y-3"
            >
              <span className="font-extrabold text-primary block">+ Thêm biến thể SKU mới</span>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                <input
                  type="text"
                  required
                  value={newVarSku}
                  onChange={(e) => setNewVarSku(e.target.value)}
                  placeholder="Mã SKU *"
                  className="h-9 px-2.5 rounded-lg border border-border-subtle bg-white uppercase font-mono"
                />
                <input
                  type="text"
                  value={newVarColor}
                  onChange={(e) => setNewVarColor(e.target.value)}
                  placeholder="Màu sắc"
                  className="h-9 px-2.5 rounded-lg border border-border-subtle bg-white"
                />
                <input
                  type="text"
                  value={newVarStorage}
                  onChange={(e) => setNewVarStorage(e.target.value)}
                  placeholder="Bộ nhớ (512GB)"
                  className="h-9 px-2.5 rounded-lg border border-border-subtle bg-white"
                />
                <input
                  type="number"
                  min={0}
                  required
                  value={newVarPrice}
                  onChange={(e) => setNewVarPrice(Number(e.target.value))}
                  placeholder="Giá bán *"
                  className="h-9 px-2.5 rounded-lg border border-border-subtle bg-white"
                />
                <input
                  type="number"
                  min={0}
                  required
                  value={newVarStock}
                  onChange={(e) => setNewVarStock(Number(e.target.value))}
                  placeholder="Tồn kho *"
                  className="h-9 px-2.5 rounded-lg border border-border-subtle bg-white"
                />
                <button
                  type="submit"
                  disabled={addingVariant}
                  className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  {addingVariant ? 'Đang thêm...' : '+ Thêm SKU'}
                </button>
              </div>
              <input
                type="url"
                value={newVarImage}
                onChange={(e) => setNewVarImage(e.target.value)}
                placeholder="URL ảnh riêng cho màu sắc này (Tùy chọn, định dạng https://...)"
                className="w-full h-9 px-3 rounded-lg border border-border-subtle bg-white"
              />
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
