import React, { useCallback, useEffect, useState } from 'react';
import {
  Brand,
  Category,
  Product,
  ProductLine,
  Review,
} from '../../types/api';
import {
  brandsApi,
  categoriesApi,
  productLinesApi,
  reviewsApi,
} from '../../services/api';
import { slugifyVi } from './AdminProductsSection';

interface AdminReviewsProps {
  products: Product[];
}

export const AdminReviewsModerationSection: React.FC<AdminReviewsProps> = ({ products }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [submittingReply, setSubmittingReply] = useState<boolean>(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = useState<string>('');
  const [savingReplyId, setSavingReplyId] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await reviewsApi.getReviewsForModeration();
      const baseReviews = Array.isArray(list) ? list : [];

      const uniqueProductIds = Array.from(
        new Set(baseReviews.map((rev) => String(rev.productId)).filter(Boolean)),
      );

      if (uniqueProductIds.length === 0) {
        setReviews(baseReviews);
        return;
      }

      const productReviewsResults = await Promise.allSettled(
        uniqueProductIds.map((productId) => reviewsApi.getProductReviews(productId)),
      );

      const repliesByReviewId = new Map<string, Review['replies']>();
      for (const result of productReviewsResults) {
        if (result.status === 'fulfilled') {
          for (const item of result.value.reviews) {
            if (item.replies && item.replies.length > 0) {
              repliesByReviewId.set(String(item._id), item.replies);
            }
          }
        }
      }

      setReviews(
        baseReviews.map((rev) => ({
          ...rev,
          replies: rev.replies?.length ? rev.replies : repliesByReviewId.get(String(rev._id)) ?? [],
        })),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const handleToggleHidden = async (rev: Review) => {
    try {
      await reviewsApi.moderateReview(rev._id, !rev.isHidden);
      await loadReviews();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Cập nhật kiểm duyệt thất bại');
    }
  };

  const handleSendReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await reviewsApi.replyToReview(reviewId, replyText.trim());
      setReplyingId(null);
      setReplyText('');
      alert('Đã gửi phản hồi chính thức của TecoStore thành công!');
      await loadReviews();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gửi phản hồi thất bại');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleUpdateReply = async (replyId: string) => {
    if (!editingReplyText.trim()) return;
    setSavingReplyId(replyId);
    try {
      await reviewsApi.updateReview(replyId, { comment: editingReplyText.trim() });
      setEditingReplyId(null);
      setEditingReplyText('');
      await loadReviews();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Cập nhật phản hồi thất bại');
    } finally {
      setSavingReplyId(null);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa phản hồi này?')) return;
    setSavingReplyId(replyId);
    try {
      await reviewsApi.deleteReview(replyId);
      await loadReviews();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xóa phản hồi thất bại');
    } finally {
      setSavingReplyId(null);
    }
  };

  return (
    <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div>
          <h3 className="text-base font-extrabold text-text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">reviews</span>
            Kiểm duyệt Đánh giá &amp; Phản hồi Khách hàng ({reviews.length})
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Ẩn/hiện các đánh giá vi phạm tiêu chuẩn và gửi phản hồi chăm sóc khách hàng từ TecoStore
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadReviews()}
          className="px-3.5 py-2 rounded-xl border border-border-subtle hover:border-primary text-xs font-bold text-primary cursor-pointer"
        >
          Làm mới
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-badge-discount text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-text-secondary">Đang tải đánh giá...</div>
      ) : reviews.length === 0 ? (
        <div className="py-12 text-center text-xs text-text-secondary">
          Chưa có đánh giá nào từ khách hàng.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((rev) => {
            const matchedProd = products.find((p) => String(p._id) === String(rev.productId));
            return (
              <div
                key={rev._id}
                className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                  rev.isHidden
                    ? 'bg-slate-100/80 border-slate-300 opacity-75'
                    : 'bg-slate-50/50 border-border-subtle'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-primary">
                      {matchedProd ? matchedProd.name : `SP #${String(rev.productId).slice(-6)}`}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                      ★ {rev.rating}/5
                    </span>
                    <span className="text-text-secondary">
                      • Khách #{String(rev.userId).slice(-5).toUpperCase()}
                    </span>
                    {rev.createdAt && (
                      <span className="text-text-secondary">
                        • {new Date(rev.createdAt).toLocaleString('vi-VN')}
                      </span>
                    )}
                    {rev.isHidden && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-badge-discount font-bold text-[10px]">
                        ĐANG ẨN
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!rev.isHidden && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingId(replyingId === rev._id ? null : rev._id);
                          setReplyText('');
                        }}
                        className="px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-primary font-bold cursor-pointer"
                      >
                        Phản hồi
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleToggleHidden(rev)}
                      className={`px-3 py-1 rounded-lg border font-bold cursor-pointer ${
                        rev.isHidden
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-red-200 bg-white text-badge-discount hover:bg-red-50'
                      }`}
                    >
                      {rev.isHidden ? 'Hiện lại' : 'Ẩn đánh giá'}
                    </button>
                  </div>
                </div>

                <p className="text-slate-700 leading-relaxed">{rev.comment}</p>

                {rev.replies && rev.replies.length > 0 && (
                  <div className="pl-3.5 border-l-2 border-primary/30 space-y-2 pt-1">
                    {rev.replies.map((reply) => {
                      const isEditing = editingReplyId === reply._id;
                      const isBusy = savingReplyId === reply._id;
                      return (
                        <div
                          key={reply._id}
                          className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-primary">Phản hồi từ TecoStore</span>
                              {reply.createdAt && (
                                <span className="text-text-secondary">
                                  • {new Date(reply.createdAt).toLocaleString('vi-VN')}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setEditingReplyId(isEditing ? null : reply._id);
                                  setEditingReplyText(reply.comment);
                                }}
                                className="px-2 py-0.5 rounded-md bg-white border border-blue-200 text-primary font-bold hover:bg-blue-100 cursor-pointer disabled:opacity-50"
                              >
                                {isEditing ? 'Hủy' : 'Sửa'}
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleDeleteReply(reply._id)}
                                className="px-2 py-0.5 rounded-md bg-white border border-red-200 text-badge-discount font-bold hover:bg-red-50 cursor-pointer disabled:opacity-50"
                              >
                                {isBusy && !isEditing ? 'Đang xóa...' : 'Xóa'}
                              </button>
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="flex gap-2 pt-1">
                              <input
                                type="text"
                                value={editingReplyText}
                                onChange={(e) => setEditingReplyText(e.target.value)}
                                placeholder="Nhập nội dung phản hồi mới..."
                                className="flex-1 h-8 px-2.5 rounded-lg border border-blue-200 bg-white focus:outline-none focus:border-primary"
                              />
                              <button
                                type="button"
                                disabled={isBusy || !editingReplyText.trim()}
                                onClick={() => void handleUpdateReply(reply._id)}
                                className="px-3 h-8 rounded-lg bg-primary text-white font-bold cursor-pointer disabled:opacity-50"
                              >
                                {isBusy ? 'Đang lưu...' : 'Lưu'}
                              </button>
                            </div>
                          ) : (
                            <p className="text-slate-700 leading-relaxed">{reply.comment}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {replyingId === rev._id && (
                  <div className="pt-2 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Nhập phản hồi chính thức của TecoStore..."
                      className="flex-1 h-9 px-3 rounded-xl border border-border-subtle bg-white focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      disabled={submittingReply || !replyText.trim()}
                      onClick={() => void handleSendReply(rev._id)}
                      className="px-4 h-9 rounded-xl bg-primary text-white font-bold cursor-pointer disabled:opacity-50"
                    >
                      {submittingReply ? 'Đang gửi...' : 'Gửi phản hồi'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface AdminCatalogProps {
  categories: Category[];
  brands: Brand[];
  productLines: ProductLine[];
  onRefreshCatalog: () => Promise<void>;
}

export const AdminCatalogSection: React.FC<AdminCatalogProps> = ({
  categories,
  brands,
  productLines,
  onRefreshCatalog,
}) => {
  // Category form
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState('phone');

  // Brand form
  const [brandName, setBrandName] = useState('');
  const [brandLogo, setBrandLogo] = useState('');

  // ProductLine (Series) form
  const [lineName, setLineName] = useState('');
  const [lineBrandId, setLineBrandId] = useState(brands[0]?._id || '');
  const [lineCatId, setLineCatId] = useState(categories[0]?._id || '');

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      await categoriesApi.create({
        name: catName.trim(),
        slug: slugifyVi(catName),
        productType: catType,
      });
      setCatName('');
      await onRefreshCatalog();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Thêm danh mục thất bại');
    }
  };

  const handleDeleteCategory = async (c: Category) => {
    if (!window.confirm(`Xóa danh mục "${c.name}"?`)) return;
    try {
      await categoriesApi.remove(c._id);
      await onRefreshCatalog();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xóa danh mục thất bại');
    }
  };

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;
    try {
      await brandsApi.create({
        name: brandName.trim(),
        slug: slugifyVi(brandName),
        ...(brandLogo.trim() ? { logo: brandLogo.trim() } : {}),
        status: 'active',
      });
      setBrandName('');
      setBrandLogo('');
      await onRefreshCatalog();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Thêm thương hiệu thất bại');
    }
  };

  const handleDeleteBrand = async (b: Brand) => {
    if (!window.confirm(`Xóa thương hiệu "${b.name}"?`)) return;
    try {
      await brandsApi.remove(b._id);
      await onRefreshCatalog();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xóa thương hiệu thất bại');
    }
  };

  const handleAddProductLine = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBrand = lineBrandId || brands[0]?._id;
    const targetCat = lineCatId || categories[0]?._id;
    if (!lineName.trim() || !targetBrand || !targetCat) return;
    try {
      await productLinesApi.create({
        name: lineName.trim(),
        slug: slugifyVi(lineName),
        brandId: targetBrand,
        categoryId: targetCat,
        status: 'active',
      });
      setLineName('');
      await onRefreshCatalog();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Thêm dòng sản phẩm thất bại');
    }
  };

  const handleDeleteProductLine = async (pl: ProductLine) => {
    if (!window.confirm(`Xóa dòng sản phẩm "${pl.name}"?`)) return;
    try {
      await productLinesApi.remove(pl._id);
      await onRefreshCatalog();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xóa dòng sản phẩm thất bại');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-xs">
      {/* 1. Categories */}
      <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs space-y-4">
        <h4 className="text-sm font-extrabold text-text-primary flex items-center gap-1.5 pb-2 border-b border-border-subtle">
          <span className="material-symbols-outlined text-primary text-[19px]">category</span>
          Danh mục ngành hàng ({categories.length})
        </h4>

        <form onSubmit={handleAddCategory} className="space-y-2">
          <input
            type="text"
            required
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="Tên danh mục mới..."
            className="w-full h-9 px-3 rounded-xl border border-border-subtle"
          />
          <div className="flex gap-2">
            <select
              value={catType}
              onChange={(e) => setCatType(e.target.value)}
              className="flex-1 h-9 px-2.5 rounded-xl border border-border-subtle bg-white"
            >
              <option value="phone">Điện thoại (phone)</option>
              <option value="laptop">Laptop (laptop)</option>
              <option value="tablet">Máy tính bảng (tablet)</option>
              <option value="accessory">Phụ kiện (accessory)</option>
            </select>
            <button
              type="submit"
              className="px-3.5 h-9 rounded-xl bg-primary text-white font-bold cursor-pointer"
            >
              + Thêm
            </button>
          </div>
        </form>

        <div className="divide-y divide-border-subtle max-h-72 overflow-y-auto pr-1">
          {categories.map((c) => (
            <div key={c._id} className="py-2 flex items-center justify-between gap-2">
              <div>
                <span className="font-bold text-text-primary block">{c.name}</span>
                <span className="text-[10px] font-mono text-text-secondary">
                  /{c.slug} • {c.productType}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleDeleteCategory(c)}
                className="text-badge-discount hover:underline font-bold cursor-pointer"
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Brands */}
      <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs space-y-4">
        <h4 className="text-sm font-extrabold text-text-primary flex items-center gap-1.5 pb-2 border-b border-border-subtle">
          <span className="material-symbols-outlined text-primary text-[19px]">verified</span>
          Thương hiệu / Hãng ({brands.length})
        </h4>

        <form onSubmit={handleAddBrand} className="space-y-2">
          <input
            type="text"
            required
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Tên hãng (VD: Sony, Anker)..."
            className="w-full h-9 px-3 rounded-xl border border-border-subtle"
          />
          <div className="flex gap-2">
            <input
              type="url"
              value={brandLogo}
              onChange={(e) => setBrandLogo(e.target.value)}
              placeholder="URL Logo https://... (Tùy chọn)"
              className="flex-1 h-9 px-3 rounded-xl border border-border-subtle"
            />
            <button
              type="submit"
              className="px-3.5 h-9 rounded-xl bg-primary text-white font-bold cursor-pointer"
            >
              + Thêm
            </button>
          </div>
        </form>

        <div className="divide-y divide-border-subtle max-h-72 overflow-y-auto pr-1">
          {brands.map((b) => (
            <div key={b._id} className="py-2 flex items-center justify-between gap-2">
              <div>
                <span className="font-bold text-text-primary block">{b.name}</span>
                <span className="text-[10px] font-mono text-text-secondary">/{b.slug}</span>
              </div>
              <button
                type="button"
                onClick={() => void handleDeleteBrand(b)}
                className="text-badge-discount hover:underline font-bold cursor-pointer"
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Product Lines / Series */}
      <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs space-y-4">
        <h4 className="text-sm font-extrabold text-text-primary flex items-center gap-1.5 pb-2 border-b border-border-subtle">
          <span className="material-symbols-outlined text-primary text-[19px]">account_tree</span>
          Dòng máy / Series ({productLines.length})
        </h4>

        <form onSubmit={handleAddProductLine} className="space-y-2">
          <input
            type="text"
            required
            value={lineName}
            onChange={(e) => setLineName(e.target.value)}
            placeholder="Tên Series (VD: iPhone 17 Series)..."
            className="w-full h-9 px-3 rounded-xl border border-border-subtle"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={lineBrandId || brands[0]?._id || ''}
              onChange={(e) => setLineBrandId(e.target.value)}
              className="h-9 px-2 rounded-xl border border-border-subtle bg-white"
            >
              {brands.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              value={lineCatId || categories[0]?._id || ''}
              onChange={(e) => setLineCatId(e.target.value)}
              className="h-9 px-2 rounded-xl border border-border-subtle bg-white"
            >
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full h-9 rounded-xl bg-primary text-white font-bold cursor-pointer"
          >
            + Thêm Dòng sản phẩm
          </button>
        </form>

        <div className="divide-y divide-border-subtle max-h-60 overflow-y-auto pr-1">
          {productLines.map((pl) => (
            <div key={pl._id} className="py-2 flex items-center justify-between gap-2">
              <div>
                <span className="font-bold text-text-primary block">{pl.name}</span>
                <span className="text-[10px] font-mono text-text-secondary">/{pl.slug}</span>
              </div>
              <button
                type="button"
                onClick={() => void handleDeleteProductLine(pl)}
                className="text-badge-discount hover:underline font-bold cursor-pointer"
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
