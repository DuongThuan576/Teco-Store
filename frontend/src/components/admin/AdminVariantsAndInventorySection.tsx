import React, { useEffect, useMemo, useState } from 'react';
import {
  Brand,
  Category,
  Product,
  ProductLine,
  ProductVariant,
} from '../../types/api';
import {
  formatVndPrice,
  getProductImage,
  getTotalStock,
  productsApi,
} from '../../services/api';

interface AdminVariantsPageProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  productLines: ProductLine[];
  isAdmin: boolean;
  initialProductId?: string;
  onEditParentProduct: (product: Product) => void;
  onRefreshCatalog: () => Promise<void>;
}

export const AdminVariantsPage: React.FC<AdminVariantsPageProps> = ({
  products,
  categories,
  brands,
  productLines,
  isAdmin,
  initialProductId,
  onEditParentProduct,
  onRefreshCatalog,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProductId || products[0]?._id || '',
  );

  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
    } else if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0]._id);
    }
  }, [initialProductId, products, selectedProductId]);

  const selectedProduct = useMemo(
    () => products.find((p) => p._id === selectedProductId) || products[0] || null,
    [products, selectedProductId],
  );

  // Filters
  const [skuSearch, setSkuSearch] = useState<string>('');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [storageFilter, setStorageFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low' | 'out'>(
    'all',
  );
  const [selectedVariantKeys, setSelectedVariantKeys] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Add / Edit Variant Modal
  const [showVariantModal, setShowVariantModal] = useState<boolean>(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [varSku, setVarSku] = useState<string>('');
  const [varColor, setVarColor] = useState<string>('');
  const [varStorage, setVarStorage] = useState<string>('');
  const [varPrice, setVarPrice] = useState<number>(0);
  const [varStock, setVarStock] = useState<number>(10);
  const [varImage, setVarImage] = useState<string>('');
  const [savingVariant, setSavingVariant] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Batch price adjustment modal
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchStockDelta, setBatchStockDelta] = useState<number>(0);
  const [applyingBatch, setApplyingBatch] = useState<boolean>(false);

  useEffect(() => {
    setSelectedVariantKeys([]);
    setCurrentPage(1);
    setColorFilter('all');
    setStorageFilter('all');
  }, [selectedProduct?._id]);

  const variants = selectedProduct?.variants || [];

  const availableColors = useMemo(
    () => Array.from(new Set(variants.map((v) => v.color).filter(Boolean))) as string[],
    [variants],
  );

  const availableStorages = useMemo(
    () => Array.from(new Set(variants.map((v) => v.storage).filter(Boolean))) as string[],
    [variants],
  );

  const filteredVariants = useMemo(() => {
    const q = skuSearch.trim().toLowerCase();
    return variants.filter((v) => {
      if (colorFilter !== 'all' && v.color !== colorFilter) return false;
      if (storageFilter !== 'all' && v.storage !== storageFilter) return false;
      if (stockStatusFilter === 'in_stock' && v.stock <= 10) return false;
      if (stockStatusFilter === 'low' && (v.stock <= 0 || v.stock > 10)) return false;
      if (stockStatusFilter === 'out' && v.stock > 0) return false;
      if (!q) return true;
      return (
        v.sku.toLowerCase().includes(q) ||
        (v.color || '').toLowerCase().includes(q) ||
        (v.storage || '').toLowerCase().includes(q)
      );
    });
  }, [variants, skuSearch, colorFilter, storageFilter, stockStatusFilter]);

  const priceRangeText = useMemo(() => {
    if (variants.length === 0) return 'Liên hệ';
    const prices = variants.map((v) => v.price).filter((p) => p > 0);
    if (prices.length === 0) return 'Liên hệ';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return formatVndPrice(min);
    return `${formatVndPrice(min)} - ${formatVndPrice(max)}`;
  }, [variants]);

  const totalPages = Math.max(1, Math.ceil(filteredVariants.length / pageSize));
  const paginatedVariants = filteredVariants.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const openAddVariantModal = () => {
    if (!selectedProduct) return;
    setEditingVariant(null);
    const prefix = selectedProduct.slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setVarSku(`${prefix}-${Date.now().toString().slice(-4)}`);
    setVarColor('');
    setVarStorage('256GB');
    setVarPrice(variants[0]?.price || 19990000);
    setVarStock(20);
    setVarImage(selectedProduct.images?.[0] || '');
    setModalError(null);
    setShowVariantModal(true);
  };

  const openEditVariantModal = (v: ProductVariant) => {
    setEditingVariant(v);
    setVarSku(v.sku);
    setVarColor(v.color || '');
    setVarStorage(v.storage || '');
    setVarPrice(v.price);
    setVarStock(v.stock);
    setVarImage(v.images?.[0] || '');
    setModalError(null);
    setShowVariantModal(true);
  };

  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setModalError(null);

    setSavingVariant(true);
    try {
      const imagesPayload = varImage.trim() ? [varImage.trim()] : undefined;
      if (editingVariant && editingVariant._id) {
        await productsApi.updateVariant(selectedProduct._id, editingVariant._id, {
          color: varColor.trim() || undefined,
          storage: varStorage.trim() || undefined,
          price: Number(varPrice),
          stock: Number(varStock),
          ...(imagesPayload ? { images: imagesPayload } : {}),
        });
      } else {
        await productsApi.addVariant(selectedProduct._id, {
          sku: varSku.trim().toUpperCase(),
          color: varColor.trim() || undefined,
          storage: varStorage.trim() || undefined,
          price: Number(varPrice),
          stock: Number(varStock),
          ...(imagesPayload ? { images: imagesPayload } : {}),
        });
      }
      setShowVariantModal(false);
      await onRefreshCatalog();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Lưu phiên bản SKU thất bại.');
    } finally {
      setSavingVariant(false);
    }
  };

  const handleDeleteVariant = async (v: ProductVariant) => {
    if (!selectedProduct || !v._id) return;
    if (variants.length <= 1) {
      alert('Sản phẩm bắt buộc phải có tối thiểu 1 phiên bản SKU.');
      return;
    }
    if (!window.confirm(`Xóa phiên bản SKU "${v.sku}" khỏi ${selectedProduct.name}?`)) return;
    try {
      await productsApi.removeVariant(selectedProduct._id, v._id);
      await onRefreshCatalog();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xóa biến thể thất bại');
    }
  };

  const handleApplyBatchStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || selectedVariantKeys.length === 0) return;
    setApplyingBatch(true);
    try {
      for (const v of variants) {
        const key = v._id || v.sku;
        if (selectedVariantKeys.includes(key) && v._id) {
          const nextStock = Math.max(0, v.stock + Number(batchStockDelta));
          await productsApi.updateVariant(selectedProduct._id, v._id, { stock: nextStock });
        }
      }
      setShowBatchModal(false);
      setBatchStockDelta(0);
      setSelectedVariantKeys([]);
      await onRefreshCatalog();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Cập nhật hàng loạt thất bại');
    } finally {
      setApplyingBatch(false);
    }
  };

  const resetFilters = () => {
    setSkuSearch('');
    setColorFilter('all');
    setStorageFilter('all');
    setStockStatusFilter('all');
  };

  const categoryName =
    categories.find((c) => c._id === selectedProduct?.categoryId)?.name || 'Chưa phân loại';
  const brandName =
    brands.find((b) => b._id === selectedProduct?.brandId)?.name || 'Chưa gắn hãng';
  const lineName =
    productLines.find((pl) => pl._id === selectedProduct?.productLineId)?.name || 'Mặc định';
  const ramSpec = String(selectedProduct?.specifications?.ram || '');

  const isAllSelected =
    paginatedVariants.length > 0 &&
    paginatedVariants.every((v) => selectedVariantKeys.includes(v._id || v.sku));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedVariantKeys([]);
    } else {
      setSelectedVariantKeys(paginatedVariants.map((v) => v._id || v.sku));
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Quản lý phiên bản sản phẩm
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý các biến thể SKU, cấu hình bán hàng, thuộc tính màu sắc, bộ nhớ, giá bán và theo dõi tồn kho theo từng phiên bản của sản phẩm.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-auto">
          <button
            type="button"
            disabled={selectedVariantKeys.length === 0}
            onClick={() => setShowBatchModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 disabled:opacity-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
          >
            <span className="material-symbols-outlined text-[17px]">tune</span>
            <span>Điều chỉnh kho hàng loạt</span>
          </button>
          <button
            type="button"
            disabled={!selectedProduct}
            onClick={openAddVariantModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Thêm phiên bản mới</span>
          </button>
        </div>
      </div>

      {/* Parent Product Selector Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl px-5 py-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <span className="font-semibold text-slate-600">Chọn sản phẩm cha:</span>
          <select
            value={selectedProduct?._id || ''}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="h-9 px-3.5 rounded-xl border border-blue-200 bg-blue-50/40 text-blue-700 font-bold text-xs focus:outline-none focus:border-blue-500 min-w-[260px] max-w-full cursor-pointer"
          >
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                [SP-{p._id.slice(-5).toUpperCase()}] {p.name} - {p.variants?.length || 0} phiên bản
              </option>
            ))}
          </select>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Đang đồng bộ SKU
          </span>
        </div>

        <button
          type="button"
          onClick={() => void onRefreshCatalog()}
          className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">sync</span>
          <span>Đồng bộ lại</span>
        </button>
      </div>

      {/* Parent Product Summary Card */}
      {selectedProduct && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl border border-slate-200 bg-slate-50 p-2 flex items-center justify-center flex-shrink-0">
              <span className="absolute -top-2 -left-2 px-1.5 py-0.5 rounded bg-slate-800 text-white text-[9px] font-extrabold">
                SP
              </span>
              <img
                src={getProductImage(selectedProduct, 0)}
                alt={selectedProduct.name}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-extrabold text-slate-900">{selectedProduct.name}</h2>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold text-[11px]">
                  SP-{selectedProduct._id.slice(-6).toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>
                  Danh mục: <strong className="text-slate-800">{categoryName}</strong>
                </span>
                <span>•</span>
                <span>
                  Thương hiệu: <strong className="text-slate-800">{brandName}</strong>
                </span>
                <span>•</span>
                <span>
                  Dòng: <strong className="text-slate-800">{lineName}</strong>
                </span>
              </p>
            </div>
          </div>

          {/* 4 Metric Columns */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Tổng phiên bản
              </span>
              <span className="text-base font-black text-slate-900 mt-0.5 block">
                {variants.length} SKU
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Tổng tồn kho
              </span>
              <span className="text-base font-black text-blue-600 mt-0.5 block">
                {getTotalStock(selectedProduct)} chiếc
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Khoảng giá niêm yết
              </span>
              <span className="text-sm font-extrabold text-slate-900 mt-1 block">
                {priceRangeText}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Trạng thái gốc
              </span>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold mt-1 ${
                  selectedProduct.isActive ? 'text-emerald-600' : 'text-slate-500'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedProduct.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
                {selectedProduct.isActive
                  ? 'Đang kinh doanh (Active)'
                  : 'Ngừng kinh doanh (Hidden)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap pt-1 text-xs">
            <button
              type="button"
              onClick={() => onEditParentProduct(selectedProduct)}
              className="text-blue-600 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Chỉnh sửa sản phẩm gốc</span>
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
            </button>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
              <span className="material-symbols-outlined text-[14px]">info</span>
              Tồn kho được đồng bộ thời gian thực với MongoDB Transaction khi khách đặt hàng
            </span>
          </div>
        </div>
      )}

      {/* Filter Bar Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              value={skuSearch}
              onChange={(e) => setSkuSearch(e.target.value)}
              placeholder="Tìm theo SKU (IP15PM-256B-NT...), màu sắc, dung lượng..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="all">Tất cả màu sắc</option>
              {availableColors.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={storageFilter}
              onChange={(e) => setStorageFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="all">Tất cả dung lượng</option>
              {availableStorages.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={stockStatusFilter}
              onChange={(e) =>
                setStockStatusFilter(e.target.value as 'all' | 'in_stock' | 'low' | 'out')
              }
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="all">Tất cả tình trạng kho</option>
              <option value="in_stock">Sẵn hàng (&gt; 10 chiếc)</option>
              <option value="low">Sắp hết hàng (1 - 10 chiếc)</option>
              <option value="out">Hết hàng (0 chiếc)</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-400 uppercase">Đang áp dụng:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
              {colorFilter === 'all' ? 'Tất cả màu' : `Màu: ${colorFilter}`}
            </span>
            {selectedProduct && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                Sản phẩm: {selectedProduct.name}
              </span>
            )}
            {(skuSearch ||
              colorFilter !== 'all' ||
              storageFilter !== 'all' ||
              stockStatusFilter !== 'all') && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-blue-600 hover:underline font-bold cursor-pointer ml-1"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            <button
              type="button"
              onClick={() => void onRefreshCatalog()}
              className="hover:text-blue-600 inline-flex items-center gap-1 cursor-pointer font-medium"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              Làm mới dữ liệu
            </button>
            <span>•</span>
            <span>
              Hiển thị <strong>{filteredVariants.length}</strong> / {variants.length} phiên bản
            </span>
          </div>
        </div>
      </div>

      {/* Enterprise Variants Data Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden text-xs">
        {/* Bulk Toolbar */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded text-blue-600 cursor-pointer"
              />
              <span>Chọn tất cả biến thể</span>
            </label>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              Đã chọn: <strong className="text-slate-900">{selectedVariantKeys.length}</strong> mục
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selectedVariantKeys.length === 0}
              onClick={() => setShowBatchModal(true)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-blue-500 disabled:opacity-40 text-slate-700 font-semibold text-[11px] cursor-pointer"
            >
              Cập nhật tồn kho hàng loạt
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50/40">
                <th className="py-3.5 px-4 w-10"></th>
                <th className="py-3.5 px-3 font-bold">STT</th>
                <th className="py-3.5 px-3 font-bold">Ảnh</th>
                <th className="py-3.5 px-3 font-bold">Mã SKU</th>
                <th className="py-3.5 px-3 font-bold">Tên phiên bản &amp; Cấu hình</th>
                <th className="py-3.5 px-3 font-bold">Thuộc tính ngành hàng</th>
                <th className="py-3.5 px-3 font-bold text-right">Giá bán thực tế</th>
                <th className="py-3.5 px-4 font-bold text-center">Tồn kho hiện tại</th>
                <th className="py-3.5 px-3 font-bold text-center">Trạng thái</th>
                <th className="py-3.5 px-4 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedVariants.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Không có biến thể SKU nào khớp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                paginatedVariants.map((v, idx) => {
                  const key = v._id || v.sku;
                  const checked = selectedVariantKeys.includes(key);
                  const stt = String((currentPage - 1) * pageSize + idx + 1).padStart(2, '0');
                  const thumb =
                    v.images?.[0] ||
                    (selectedProduct ? getProductImage(selectedProduct, idx) : '');

                  return (
                    <tr
                      key={key}
                      className={`hover:bg-blue-50/25 transition-colors ${
                        checked ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedVariantKeys((prev) =>
                              prev.includes(key)
                                ? prev.filter((k) => k !== key)
                                : [...prev, key],
                            )
                          }
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-400 font-semibold">
                        {stt}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="w-11 h-11 rounded-xl border border-slate-200 bg-slate-50 p-1 flex items-center justify-center">
                          <img
                            src={thumb}
                            alt={v.sku}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-mono font-extrabold text-blue-600 text-xs">
                          {v.sku}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {v._id ? v._id.slice(-10).toUpperCase() : 'SYNCED'}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">
                          {selectedProduct?.name}{' '}
                          {[v.storage, v.color].filter(Boolean).join(' ')}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Mã cấu hình: CFG-{v.sku.slice(-8).toUpperCase()}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1.5">
                          {v.color && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-slate-500" />
                              {v.color}
                            </span>
                          )}
                          {ramSpec && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[10px]">
                              RAM {ramSpec}
                            </span>
                          )}
                          {v.storage && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px]">
                              {v.storage}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <span className="font-extrabold text-blue-600 text-sm block">
                          {formatVndPrice(v.price)}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          Giá niêm yết chuẩn
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {v.stock > 10 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {v.stock} chiếc (Sẵn hàng)
                          </span>
                        ) : v.stock > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {v.stock} chiếc (Sắp hết)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            0 chiếc (Hết hàng)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                            v.stock > 0 && selectedProduct?.isActive
                              ? 'text-emerald-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {v.stock > 0 && selectedProduct?.isActive ? 'Đang bán' : 'Tạm ngưng'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditVariantModal(v)}
                            title="Chỉnh sửa phiên bản SKU"
                            className="w-8 h-8 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteVariant(v)}
                              title="Xóa phiên bản SKU"
                              className="w-8 h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        <div className="px-5 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Hiển thị từ{' '}
            <strong className="text-slate-800">
              {filteredVariants.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </strong>{' '}
            đến{' '}
            <strong className="text-slate-800">
              {Math.min(currentPage * pageSize, filteredVariants.length)}
            </strong>{' '}
            trên tổng số <strong className="text-slate-800">{filteredVariants.length}</strong> biến thể SKU
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Số dòng mỗi trang:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 px-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-700"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                ‹
              </button>
              <span className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center">
                {currentPage}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Variant Modal */}
      {showVariantModal && selectedProduct && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowVariantModal(false)}
        >
          <form
            onSubmit={handleSaveVariant}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingVariant
                    ? `Cập nhật SKU: ${editingVariant.sku}`
                    : 'Thêm phiên bản SKU mới'}
                </h3>
                <p className="text-slate-500 mt-0.5">Sản phẩm gốc: {selectedProduct.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowVariantModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 font-semibold">
                {modalError}
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">Mã định danh SKU *</label>
              <input
                type="text"
                required
                disabled={Boolean(editingVariant)}
                value={varSku}
                onChange={(e) => setVarSku(e.target.value.toUpperCase())}
                placeholder="VD: IP15PM-256B-NAT"
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 font-mono font-bold uppercase disabled:bg-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Màu sắc</label>
                <input
                  type="text"
                  value={varColor}
                  onChange={(e) => setVarColor(e.target.value)}
                  placeholder="VD: Titan Tự Nhiên"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dung lượng / Cấu hình</label>
                <input
                  type="text"
                  value={varStorage}
                  onChange={(e) => setVarStorage(e.target.value)}
                  placeholder="VD: 256GB / 512GB"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Giá bán thực tế (₫) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={varPrice}
                  onChange={(e) => setVarPrice(Number(e.target.value))}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 font-bold text-blue-600"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Số lượng tồn kho *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={varStock}
                  onChange={(e) => setVarStock(Number(e.target.value))}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                URL Hình ảnh riêng của phiên bản (HTTPS)
              </label>
              <input
                type="url"
                value={varImage}
                onChange={(e) => setVarImage(e.target.value)}
                placeholder="https://..."
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVariantModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 font-bold text-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingVariant}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
              >
                {savingVariant
                  ? 'Đang lưu...'
                  : editingVariant
                  ? 'Lưu thay đổi SKU'
                  : 'Tạo phiên bản SKU'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batch Stock Adjustment Modal */}
      {showBatchModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowBatchModal(false)}
        >
          <form
            onSubmit={handleApplyBatchStock}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs"
          >
            <h3 className="text-base font-extrabold text-slate-900">
              Cập nhật kho hàng loạt ({selectedVariantKeys.length} SKU)
            </h3>
            <p className="text-slate-500">
              Nhập số lượng cộng thêm (số dương, VD: <code>+10</code>) hoặc xuất bớt (số âm, VD:{' '}
              <code>-5</code>) cho các phiên bản đã chọn:
            </p>
            <input
              type="number"
              required
              value={batchStockDelta}
              onChange={(e) => setBatchStockDelta(Number(e.target.value))}
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 font-bold text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={applyingBatch}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold cursor-pointer"
              >
                {applyingBatch ? 'Đang cập nhật...' : 'Áp dụng ngay'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ================= QUẢN LÝ TỒN KHO TOÀN HỆ THỐNG (/admin/inventory) =================
interface AdminInventoryPageProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  onOpenProductVariants: (productId: string) => void;
  onRefreshCatalog: () => Promise<void>;
}

export const AdminInventoryPage: React.FC<AdminInventoryPageProps> = ({
  products,
  categories,
  brands,
  onOpenProductVariants,
  onRefreshCatalog,
}) => {
  const [search, setSearch] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [stockEdits, setStockEdits] = useState<Record<string, number>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const flatSkus = useMemo(() => {
    const rows: Array<{
      product: Product;
      variant: ProductVariant;
      categoryName: string;
      brandName: string;
    }> = [];

    for (const p of products) {
      const catName = categories.find((c) => c._id === p.categoryId)?.name || '—';
      const brName = brands.find((b) => b._id === p.brandId)?.name || '—';
      for (const v of p.variants || []) {
        rows.push({ product: p, variant: v, categoryName: catName, brandName: brName });
      }
    }
    return rows;
  }, [products, categories, brands]);

  const stats = useMemo(() => {
    let totalUnits = 0;
    let lowCount = 0;
    let outCount = 0;
    for (const r of flatSkus) {
      totalUnits += r.variant.stock || 0;
      if (r.variant.stock === 0) outCount++;
      else if (r.variant.stock <= 10) lowCount++;
    }
    return { totalSkus: flatSkus.length, totalUnits, lowCount, outCount };
  }, [flatSkus]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flatSkus.filter((r) => {
      if (stockFilter === 'low' && (r.variant.stock <= 0 || r.variant.stock > 10)) return false;
      if (stockFilter === 'out' && r.variant.stock > 0) return false;
      if (!q) return true;
      return (
        r.variant.sku.toLowerCase().includes(q) ||
        r.product.name.toLowerCase().includes(q) ||
        r.brandName.toLowerCase().includes(q)
      );
    });
  }, [flatSkus, search, stockFilter]);

  const handleQuickSaveStock = async (prodId: string, v: ProductVariant) => {
    if (!v._id) return;
    const key = `${prodId}:${v._id}`;
    const targetStock = stockEdits[key] ?? v.stock;
    setSavingKey(key);
    try {
      await productsApi.updateVariant(prodId, v._id, { stock: Math.max(0, Number(targetStock)) });
      await onRefreshCatalog();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Cập nhật tồn kho thất bại');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          Quản lý tồn kho SKU toàn hệ thống
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Theo dõi định mức tồn kho thời gian thực, phát hiện sớm các mã SKU sắp chạm ngưỡng cạn hàng và nhập bổ sung kho nhanh.
        </p>
      </div>

      {/* Warehouse KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold">Tổng số mã SKU</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalSkus}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold">Tổng đơn vị lưu kho</span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {stats.totalUnits.toLocaleString('vi-VN')} chiếc
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold">Sắp hết hàng (1 - 10)</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{stats.lowCount} SKU</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold">Đang đứt hàng (0)</span>
          <div className="text-2xl font-black text-red-600 mt-1">{stats.outCount} SKU</div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`px-3.5 py-1.5 rounded-full font-bold border cursor-pointer ${
                stockFilter === 'all'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              Toàn bộ kho ({flatSkus.length})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('low')}
              className={`px-3.5 py-1.5 rounded-full font-bold border cursor-pointer ${
                stockFilter === 'low'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              Sắp hết hàng ({stats.lowCount})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('out')}
              className={`px-3.5 py-1.5 rounded-full font-bold border cursor-pointer ${
                stockFilter === 'out'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              Hết hàng ({stats.outCount})
            </button>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhanh mã SKU, tên sản phẩm, hãng..."
            className="w-full sm:w-72 h-9 px-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50">
                <th className="py-3 px-3">Mã SKU</th>
                <th className="py-3 px-3">Sản phẩm &amp; Phiên bản</th>
                <th className="py-3 px-3">Ngành hàng / Hãng</th>
                <th className="py-3 px-3 text-right">Đơn giá</th>
                <th className="py-3 px-3 text-center">Tình trạng</th>
                <th className="py-3 px-3 text-right">Điều chỉnh tồn kho nhanh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.slice(0, 60).map(({ product, variant, categoryName, brandName }) => {
                const key = `${product._id}:${variant._id || variant.sku}`;
                const draftVal = stockEdits[key] ?? variant.stock;

                return (
                  <tr key={key} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600">{variant.sku}</td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => onOpenProductVariants(product._id)}
                        className="font-bold text-slate-900 hover:text-blue-600 text-left cursor-pointer block"
                      >
                        {product.name}
                      </button>
                      <span className="text-[11px] text-slate-500">
                        {[variant.storage, variant.color].filter(Boolean).join(' • ') || 'Tiêu chuẩn'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {categoryName} • <strong>{brandName}</strong>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-800">
                      {formatVndPrice(variant.price)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {variant.stock > 10 ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                          Sẵn hàng ({variant.stock})
                        </span>
                      ) : variant.stock > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">
                          Sắp hết ({variant.stock})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 font-bold text-[10px]">
                          Hết hàng (0)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          value={draftVal}
                          onChange={(e) =>
                            setStockEdits((prev) => ({
                              ...prev,
                              [key]: Number(e.target.value),
                            }))
                          }
                          className="w-20 h-8 px-2 rounded-lg border border-slate-200 text-center font-bold"
                        />
                        <button
                          type="button"
                          disabled={savingKey === key || draftVal === variant.stock}
                          onClick={() => void handleQuickSaveStock(product._id, variant)}
                          className="px-3 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-35 text-white font-bold cursor-pointer"
                        >
                          {savingKey === key ? '...' : 'Lưu'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
