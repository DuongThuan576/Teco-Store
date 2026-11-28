import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brand, Category, Product } from '../types/api';
import {
  formatVndPrice,
  getPrimaryVariant,
  getProductImage,
  getTotalStock,
  productsApi,
} from '../services/api';

interface ProductCompareBarAndModalProps {
  compareProducts: Product[];
  brands: Brand[];
  categories: Category[];
  onRemoveCompare: (productId: string) => void;
  onClearCompare: () => void;
  onAddToCart: (product: Product, isBuyNow?: boolean) => void;
}

const SPEC_ROWS: Array<{ key: string; label: string }> = [
  { key: 'screenSize', label: 'Kích thước màn hình' },
  { key: 'screenTechnology', label: 'Công nghệ màn hình' },
  { key: 'cpu', label: 'Vi xử lý (CPU)' },
  { key: 'ram', label: 'Dung lượng RAM' },
  { key: 'operatingSystem', label: 'Hệ điều hành' },
  { key: 'rearCamera', label: 'Camera sau' },
  { key: 'frontCamera', label: 'Camera trước' },
  { key: 'sim', label: 'Thẻ SIM' },
  { key: 'waterResistance', label: 'Kháng nước / bụi' },
];

export const ProductCompareBarAndModal: React.FC<ProductCompareBarAndModalProps> = ({
  compareProducts,
  brands,
  categories,
  onRemoveCompare,
  onClearCompare,
  onAddToCart,
}) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [detailedMap, setDetailedMap] = useState<Record<string, Product>>({});

  // Khi mở modal so sánh, tải thêm chi tiết sản phẩm từ GET /products/slug/:slug nếu thiếu specifications
  useEffect(() => {
    if (!isModalOpen) return;
    let mounted = true;

    Promise.allSettled(
      compareProducts.map((p) =>
        p.specifications && Object.keys(p.specifications).length > 0
          ? Promise.resolve(p)
          : productsApi.findBySlug(p.slug),
      ),
    ).then((results) => {
      if (!mounted) return;
      const nextMap: Record<string, Product> = {};
      results.forEach((res, idx) => {
        const fallback = compareProducts[idx];
        if (res.status === 'fulfilled' && res.value) {
          nextMap[fallback._id] = res.value;
        } else {
          nextMap[fallback._id] = fallback;
        }
      });
      setDetailedMap(nextMap);
    });

    return () => {
      mounted = false;
    };
  }, [isModalOpen, compareProducts]);

  if (compareProducts.length === 0) {
    return null;
  }

  const resolvedProducts = compareProducts.map((p) => detailedMap[p._id] || p);

  // Tập hợp thêm các khóa thông số kỹ thuật động nếu có
  const extraSpecKeys = Array.from(
    new Set(
      resolvedProducts.flatMap((p) =>
        p.specifications ? Object.keys(p.specifications) : [],
      ),
    ),
  ).filter((k) => !SPEC_ROWS.some((row) => row.key === k));

  const formatSpecValue = (val: unknown): string => {
    if (val === undefined || val === null || val === '') return '—';
    if (typeof val === 'boolean') return val ? 'Có hỗ trợ' : 'Không';
    return String(val);
  };

  return (
    <>
      {/* ================= STICKY BOTTOM COMPARE BAR ================= */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-[1040px]">
        {isMinimized ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="px-4 py-2.5 rounded-full bg-primary text-white font-extrabold text-xs shadow-xl flex items-center gap-2 cursor-pointer hover:bg-blue-700 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
              <span>So sánh sản phẩm ({compareProducts.length}/4)</span>
            </button>
          </div>
        ) : (
          <div className="bg-white border-2 border-primary/30 rounded-2xl shadow-2xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-x-auto thin-scrollbar pb-1 md:pb-0 flex-1">
              {compareProducts.map((prod, idx) => {
                const primaryVar = getPrimaryVariant(prod);
                return (
                  <div
                    key={prod._id}
                    className="relative flex items-center gap-2.5 bg-surface-page border border-border-subtle rounded-xl p-2 pr-7 min-w-[200px] max-w-[230px] shrink-0"
                  >
                    <img
                      src={getProductImage(prod, idx)}
                      alt={prod.name}
                      className="w-11 h-11 object-contain rounded-lg bg-white p-1 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">
                        {prod.name}
                      </p>
                      <p className="text-[11px] font-extrabold text-badge-discount">
                        {formatVndPrice(primaryVar?.price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveCompare(prod._id)}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-600 text-xs flex items-center justify-center cursor-pointer"
                      title="Bỏ khỏi so sánh"
                    >
                      ×
                    </button>
                  </div>
                );
              })}

              {Array.from({ length: Math.max(0, 4 - compareProducts.length) }).map(
                (_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="hidden sm:flex items-center justify-center border border-dashed border-slate-300 rounded-xl p-2 min-w-[160px] h-[60px] text-[11px] text-slate-400 shrink-0"
                  >
                    + Chọn thêm SP ({compareProducts.length + idx + 1}/4)
                  </div>
                ),
              )}
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-border-subtle">
              <button
                type="button"
                onClick={onClearCompare}
                className="px-3 py-2 rounded-xl border border-border-subtle text-text-secondary hover:text-red-600 hover:border-red-200 text-xs font-bold cursor-pointer"
              >
                Xóa tất cả
              </button>
              <button
                type="button"
                disabled={compareProducts.length < 2}
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  compare_arrows
                </span>
                <span>
                  {compareProducts.length < 2
                    ? 'Chọn ít nhất 2 SP'
                    : `So sánh ngay (${compareProducts.length})`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                title="Thu gọn thanh so sánh"
              >
                <span className="material-symbols-outlined text-[18px]">
                  expand_more
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= PRODUCT COMPARISON MODAL ================= */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white border border-border-subtle rounded-3xl max-w-[1200px] w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between gap-4 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    compare_arrows
                  </span>
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-text-primary">
                    So sánh chi tiết sản phẩm ({resolvedProducts.length} sản phẩm)
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Đối chiếu giá bán, phiên bản cấu hình và thông số kỹ thuật trực tiếp
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 rounded-xl border border-border-subtle bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Table Body */}
            <div className="flex-1 overflow-auto thin-scrollbar p-4 sm:p-6">
              <table className="w-full border-collapse text-xs min-w-[680px]">
                <thead>
                  <tr>
                    <th className="w-44 p-3 text-left bg-slate-50 border border-border-subtle font-extrabold text-slate-700 align-top">
                      Tiêu chí so sánh
                    </th>
                    {resolvedProducts.map((prod, idx) => {
                      const primaryVar = getPrimaryVariant(prod);
                      const stock = getTotalStock(prod);
                      return (
                        <th
                          key={prod._id}
                          className="p-4 border border-border-subtle bg-white align-top min-w-[210px]"
                        >
                          <div className="flex flex-col items-center text-center space-y-2.5 relative">
                            <button
                              type="button"
                              onClick={() => onRemoveCompare(prod._id)}
                              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 flex items-center justify-center cursor-pointer"
                              title="Xóa sản phẩm này khỏi bảng so sánh"
                            >
                              ×
                            </button>
                            <img
                              src={getProductImage(prod, idx)}
                              alt={prod.name}
                              onClick={() => {
                                setIsModalOpen(false);
                                navigate(`/product/${prod.slug}`);
                              }}
                              className="w-28 h-28 object-contain cursor-pointer hover:scale-105 transition-transform"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setIsModalOpen(false);
                                navigate(`/product/${prod.slug}`);
                              }}
                              className="font-extrabold text-sm text-text-primary hover:text-primary line-clamp-2 cursor-pointer"
                            >
                              {prod.name}
                            </button>
                            <div className="text-base font-black text-badge-discount">
                              {formatVndPrice(primaryVar?.price)}
                            </div>

                            <div className="w-full flex flex-col gap-1.5 pt-1">
                              <button
                                type="button"
                                disabled={stock <= 0}
                                onClick={() => {
                                  setIsModalOpen(false);
                                  onAddToCart(prod, true);
                                }}
                                className="w-full py-2 px-2.5 rounded-lg bg-badge-discount hover:bg-red-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                              >
                                <span>Mua ngay</span>
                              </button>
                              <button
                                type="button"
                                disabled={stock <= 0}
                                onClick={() => onAddToCart(prod, false)}
                                className="w-full py-2 px-2.5 rounded-lg bg-white border border-primary text-primary hover:bg-blue-50 font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  add_shopping_cart
                                </span>
                                <span>Thêm vào giỏ</span>
                              </button>
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Thương hiệu */}
                  <tr>
                    <td className="p-3 bg-slate-50 border border-border-subtle font-bold text-slate-700">
                      Thương hiệu
                    </td>
                    {resolvedProducts.map((prod) => {
                      const b = brands.find((br) => br._id === prod.brandId);
                      return (
                        <td
                          key={prod._id}
                          className="p-3 border border-border-subtle font-semibold text-text-primary"
                        >
                          {b ? b.name : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Danh mục */}
                  <tr>
                    <td className="p-3 bg-slate-50 border border-border-subtle font-bold text-slate-700">
                      Danh mục
                    </td>
                    {resolvedProducts.map((prod) => {
                      const c = categories.find((cat) => cat._id === prod.categoryId);
                      return (
                        <td
                          key={prod._id}
                          className="p-3 border border-border-subtle text-text-secondary"
                        >
                          {c ? c.name : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Đánh giá */}
                  <tr>
                    <td className="p-3 bg-slate-50 border border-border-subtle font-bold text-slate-700">
                      Đánh giá khách hàng
                    </td>
                    {resolvedProducts.map((prod) => (
                      <td
                        key={prod._id}
                        className="p-3 border border-border-subtle font-semibold"
                      >
                        {prod.ratingCount ? (
                          <span className="text-amber-600">
                            ★ {Number(prod.ratingAverage || 0).toFixed(1)}/5 ({prod.ratingCount}{' '}
                            đánh giá)
                          </span>
                        ) : (
                          <span className="text-slate-400">Chưa có đánh giá</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Tình trạng tồn kho */}
                  <tr>
                    <td className="p-3 bg-slate-50 border border-border-subtle font-bold text-slate-700">
                      Tình trạng kho
                    </td>
                    {resolvedProducts.map((prod) => {
                      const totalStock = getTotalStock(prod);
                      return (
                        <td
                          key={prod._id}
                          className="p-3 border border-border-subtle font-bold"
                        >
                          {totalStock > 0 ? (
                            <span className="text-emerald-600">
                              Còn hàng ({totalStock} sản phẩm)
                            </span>
                          ) : (
                            <span className="text-red-500">Tạm hết hàng</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Các tùy chọn Dung lượng */}
                  <tr>
                    <td className="p-3 bg-slate-50 border border-border-subtle font-bold text-slate-700">
                      Tùy chọn bộ nhớ
                    </td>
                    {resolvedProducts.map((prod) => {
                      const storages = Array.from(
                        new Set(prod.variants?.map((v) => v.storage).filter(Boolean)),
                      );
                      return (
                        <td key={prod._id} className="p-3 border border-border-subtle">
                          {storages.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {storages.map((st) => (
                                <span
                                  key={st}
                                  className="px-2 py-0.5 rounded bg-blue-50 text-primary font-semibold text-[11px]"
                                >
                                  {st}
                                </span>
                              ))}
                            </div>
                          ) : (
                            'Tiêu chuẩn'
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Các tùy chọn Màu sắc */}
                  <tr>
                    <td className="p-3 bg-slate-50 border border-border-subtle font-bold text-slate-700">
                      Tùy chọn màu sắc
                    </td>
                    {resolvedProducts.map((prod) => {
                      const colors = Array.from(
                        new Set(prod.variants?.map((v) => v.color).filter(Boolean)),
                      );
                      return (
                        <td key={prod._id} className="p-3 border border-border-subtle">
                          {colors.length > 0 ? colors.join(', ') : 'Tiêu chuẩn'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Thông số kỹ thuật chuẩn */}
                  {SPEC_ROWS.map((row) => (
                    <tr key={row.key}>
                      <td className="p-3 bg-slate-50 border border-border-subtle font-bold text-slate-700">
                        {row.label}
                      </td>
                      {resolvedProducts.map((prod) => (
                        <td
                          key={prod._id}
                          className="p-3 border border-border-subtle text-slate-700"
                        >
                          {formatSpecValue(prod.specifications?.[row.key])}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Thông số mở rộng nếu có */}
                  {extraSpecKeys.map((key) => (
                    <tr key={key}>
                      <td className="p-3 bg-slate-50 border border-border-subtle font-bold text-slate-700 capitalize">
                        {key}
                      </td>
                      {resolvedProducts.map((prod) => (
                        <td
                          key={prod._id}
                          className="p-3 border border-border-subtle text-slate-700"
                        >
                          {formatSpecValue(prod.specifications?.[key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
