import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Brand,
  Category,
  Order,
  Product,
  ProductVariant,
  Review,
  User,
} from '../types/api';
import {
  formatVndPrice,
  getPrimaryVariant,
  ordersApi,
  productsApi,
  reviewsApi,
  FALLBACK_PRODUCT_IMAGES,
} from '../services/api';

interface ProductDetailPageProps {
  categories: Category[];
  brands: Brand[];
  currentUser: User | null;
  onAddToCart: (product: Product, variant?: ProductVariant, isBuyNow?: boolean) => void;
}

const SPEC_LABELS: Record<string, string> = {
  screenSize: 'Kích thước màn hình',
  screenTechnology: 'Công nghệ màn hình',
  cpu: 'Chip xử lý (CPU)',
  operatingSystem: 'Hệ điều hành',
  ram: 'Dung lượng RAM',
  rearCamera: 'Camera sau',
  frontCamera: 'Camera trước',
  sim: 'Thẻ SIM',
  waterResistance: 'Kháng nước / bụi',
};

const RATING_LABELS: Record<number, string> = {
  1: 'Rất tệ',
  2: 'Chưa hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Tuyệt vời',
};

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  categories,
  brands,
  currentUser,
  onAddToCart,
}) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(undefined);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [loadingSku, setLoadingSku] = useState(false);

  // ================= REVIEWS & RATING STATE (/api/reviews) =================
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [starFilter, setStarFilter] = useState<number | null>(null);

  // Purchase eligibility & user's own reviews
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);

  // New Review Form state
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [newRating, setNewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [newComment, setNewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewFeedback, setReviewFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Edit Own Review state
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editComment, setEditComment] = useState<string>('');
  const [updatingReview, setUpdatingReview] = useState<boolean>(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  // Fetch product by slug directly from backend API: /api/products/slug/:slug
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    productsApi
      .findBySlug(slug)
      .then((data) => {
        setProduct(data);
        const primary = getPrimaryVariant(data);
        setSelectedVariant(primary);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Không tìm thấy sản phẩm');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  const loadProductReviews = useCallback(async (productId: string) => {
    setLoadingReviews(true);
    try {
      const res = await reviewsApi.getProductReviews(productId);
      setReviews(res.reviews || []);
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  const loadCustomerReviewContext = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'customer') {
      setUserOrders([]);
      setMyReviews([]);
      return;
    }
    try {
      const [ordersData, myRevsData] = await Promise.all([
        ordersApi.getUserOrders().catch(() => [] as Order[]),
        reviewsApi.getMyReviews().catch(() => [] as Review[]),
      ]);
      setUserOrders(ordersData);
      setMyReviews(Array.isArray(myRevsData) ? myRevsData : []);
    } catch {
      setUserOrders([]);
      setMyReviews([]);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!product?._id) return;
    void loadProductReviews(product._id);
    void loadCustomerReviewContext();
  }, [product?._id, loadProductReviews, loadCustomerReviewContext]);

  // Compute eligible delivered orders for reviewing this product
  const eligibleDeliveredOrders = useMemo(() => {
    if (!product?._id || !currentUser || currentUser.role !== 'customer') return [];
    return userOrders.filter((ord) => {
      if (ord.orderStatus !== 'da_giao') return false;
      const hasProduct = ord.items?.some(
        (item) => String(item.productId) === String(product._id),
      );
      if (!hasProduct) return false;
      const alreadyReviewed = myReviews.some(
        (rev) =>
          String(rev.orderId) === String(ord._id) &&
          String(rev.productId) === String(product._id),
      );
      return !alreadyReviewed;
    });
  }, [product?._id, currentUser, userOrders, myReviews]);

  // Orders containing this product that are still in progress (not delivered yet)
  const inProgressProductOrders = useMemo(() => {
    if (!product?._id || !currentUser || currentUser.role !== 'customer') return [];
    return userOrders.filter((ord) => {
      if (ord.orderStatus === 'da_giao' || ord.orderStatus === 'da_huy' || ord.orderStatus === 'cancelled') {
        return false;
      }
      return ord.items?.some((item) => String(item.productId) === String(product._id));
    });
  }, [product?._id, currentUser, userOrders]);

  useEffect(() => {
    if (eligibleDeliveredOrders.length > 0) {
      setSelectedOrderId((prev) =>
        eligibleDeliveredOrders.some((o) => o._id === prev)
          ? prev
          : eligibleDeliveredOrders[0]._id,
      );
    } else {
      setSelectedOrderId('');
    }
  }, [eligibleDeliveredOrders]);

  // Rating summary statistics
  const ratingStats = useMemo(() => {
    const total = reviews.length;
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    for (const r of reviews) {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      counts[star] = (counts[star] || 0) + 1;
      sum += r.rating || 0;
    }
    const average = total > 0 ? Number((sum / total).toFixed(1)) : 0;
    return { total, average, counts };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (starFilter === null) return reviews;
    return reviews.filter((r) => Math.round(r.rating) === starFilter);
  }, [reviews, starFilter]);

  // Gallery images
  const galleryImages = useMemo(() => {
    if (!product) return FALLBACK_PRODUCT_IMAGES;
    const list: string[] = [];

    if (selectedVariant?.images && selectedVariant.images.length > 0) {
      for (const img of selectedVariant.images) {
        if (img && !list.includes(img)) list.push(img);
      }
    }

    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        if (img && !list.includes(img)) list.push(img);
      }
    }

    if (product.variants && product.variants.length > 0) {
      for (const v of product.variants) {
        if (v.images) {
          for (const img of v.images) {
            if (img && !list.includes(img)) list.push(img);
          }
        }
      }
    }

    if (list.length === 0) {
      list.push(FALLBACK_PRODUCT_IMAGES[0]);
    }

    return list;
  }, [product, selectedVariant]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedVariant]);

  // Handlers for Creating / Updating / Deleting Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product?._id || !selectedOrderId) return;

    const trimmed = newComment.trim();
    if (!trimmed) {
      setReviewFeedback({
        type: 'error',
        text: 'Vui lòng nhập nội dung nhận xét trải nghiệm sản phẩm.',
      });
      return;
    }

    setSubmittingReview(true);
    setReviewFeedback(null);

    try {
      await reviewsApi.createReview({
        orderId: selectedOrderId,
        productId: product._id,
        rating: newRating,
        comment: trimmed,
      });

      setNewComment('');
      setNewRating(5);
      setReviewFeedback({
        type: 'success',
        text: 'Cảm ơn bạn! Đánh giá sản phẩm đã được đăng thành công.',
      });

      await Promise.all([
        loadProductReviews(product._id),
        loadCustomerReviewContext(),
      ]);
    } catch (err: unknown) {
      setReviewFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể gửi đánh giá lúc này.',
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleStartEditReview = (rev: Review) => {
    setEditingReviewId(rev._id);
    setEditRating(rev.rating || 5);
    setEditComment(rev.comment || '');
    setReviewFeedback(null);
  };

  const handleSaveEditReview = async (reviewId: string) => {
    if (!product?._id) return;
    const trimmed = editComment.trim();
    if (!trimmed) {
      alert('Nội dung đánh giá không được để trống.');
      return;
    }

    setUpdatingReview(true);
    try {
      await reviewsApi.updateReview(reviewId, {
        rating: editRating,
        comment: trimmed,
      });
      setEditingReviewId(null);
      setReviewFeedback({
        type: 'success',
        text: 'Đã cập nhật đánh giá của bạn thành công.',
      });
      await Promise.all([
        loadProductReviews(product._id),
        loadCustomerReviewContext(),
      ]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Cập nhật đánh giá thất bại');
    } finally {
      setUpdatingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!product?._id) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa đánh giá này không?')) return;

    setDeletingReviewId(reviewId);
    try {
      await reviewsApi.deleteReview(reviewId);
      setReviewFeedback({
        type: 'success',
        text: 'Đã xóa đánh giá của bạn.',
      });
      await Promise.all([
        loadProductReviews(product._id),
        loadCustomerReviewContext(),
      ]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xóa đánh giá thất bại');
    } finally {
      setDeletingReviewId(null);
    }
  };

  const renderStars = (rating: number, sizeClass = 'text-[16px]') => {
    return (
      <div className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`material-symbols-outlined ${sizeClass} ${
              star <= Math.round(rating) ? 'text-amber-400' : 'text-slate-200'
            }`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-6 h-96 bg-slate-200 rounded-2xl" />
            <div className="md:col-span-6 space-y-4">
              <div className="h-8 bg-slate-200 rounded w-3/4" />
              <div className="h-16 bg-slate-200 rounded" />
              <div className="h-32 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 py-16 text-center">
        <span className="material-symbols-outlined text-[64px] text-badge-discount">
          error
        </span>
        <h2 className="text-xl font-bold text-text-primary mt-3">
          Không tìm thấy thông tin sản phẩm
        </h2>
        <p className="text-xs text-text-secondary mt-1">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-6 px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-surface-tint transition-all cursor-pointer"
        >
          Quay lại Trang chủ
        </button>
      </div>
    );
  }

  const variants = product.variants || [];
  const colors = Array.from(
    new Set(variants.map((v) => v.color).filter(Boolean)),
  ) as string[];
  const storages = Array.from(
    new Set(variants.map((v) => v.storage).filter(Boolean)),
  ) as string[];

  const handleSelectOption = async (color?: string, storage?: string) => {
    const targetColor = color ?? selectedVariant?.color;
    const targetStorage = storage ?? selectedVariant?.storage;

    const matched =
      variants.find((v) => v.color === targetColor && v.storage === targetStorage) ||
      variants.find((v) => (color ? v.color === color : v.storage === storage));

    if (!matched) return;

    setSelectedVariant(matched);

    if (product.slug && matched.sku) {
      setLoadingSku(true);
      try {
        const res = await productsApi.findVariantBySku(product.slug, matched.sku);
        if (res?.variant) {
          setSelectedVariant(res.variant);
        }
      } catch {
        // Fallback to matched variant
      } finally {
        setLoadingSku(false);
      }
    }
  };

  const category = categories.find((c) => c._id === product.categoryId);
  const brand = brands.find((b) => b._id === product.brandId);
  const specs = product.specifications || {};
  const currentPrice = selectedVariant?.price;
  const currentUserId = String(currentUser?.id || currentUser?._id || '');
  const hasAlreadyReviewedProduct = myReviews.some(
    (r) => String(r.productId) === String(product._id),
  );

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-margin-desktop py-space-sm">
      {/* ================= BREADCRUMBS ================= */}
      <nav className="flex items-center space-x-2 text-xs text-text-secondary py-2 mb-2 flex-wrap">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[15px]">home</span>
          Trang chủ
        </button>
        <span className="text-outline-variant">/</span>
        {category && (
          <>
            <button
              type="button"
              onClick={() => navigate(`/category/${category.slug}`)}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              {category.name}
            </button>
            <span className="text-outline-variant">/</span>
          </>
        )}
        {brand && (
          <>
            <span className="text-text-secondary">{brand.name}</span>
            <span className="text-outline-variant">/</span>
          </>
        )}
        <span className="text-text-primary font-semibold truncate max-w-xs sm:max-w-md">
          {product.name}
        </span>
      </nav>

      {/* ================= PRODUCT TITLE BAR ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
        <div className="space-y-1">
          <h1 className="text-headline-lg font-headline-lg text-text-primary">
            {product.name}
            {selectedVariant?.storage ? ` ${selectedVariant.storage}` : ''}
            {selectedVariant?.color ? ` - ${selectedVariant.color}` : ''}
          </h1>
          <div className="flex items-center gap-2 text-xs">
            {renderStars(ratingStats.total > 0 ? ratingStats.average : 5, 'text-[16px]')}
            <a
              href="#product-reviews"
              className="font-semibold text-primary hover:underline"
            >
              {ratingStats.total > 0
                ? `${ratingStats.average}/5 (${ratingStats.total} đánh giá)`
                : 'Chưa có đánh giá'}
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span className="font-mono text-slate-500">Mã SKU: {selectedVariant?.sku || 'N/A'}</span>
          <span>•</span>
          <span className="text-slate-600 font-medium">Tồn kho: {selectedVariant?.stock ?? 0}</span>
        </div>
      </div>

      {/* ================= MAIN DETAIL LAYOUT ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
        {/* Left Column: Image Gallery + Mô tả sản phẩm (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="aspect-square rounded-2xl bg-white border border-border-subtle p-6 flex items-center justify-center relative overflow-hidden shadow-xs">
            <img
              src={galleryImages[activeImageIndex]}
              alt={product.name}
              className="w-full h-full object-contain transition-all duration-300"
            />
          </div>

          {galleryImages.length > 1 && (
            <div className="grid grid-cols-4 gap-2.5">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`aspect-square rounded-xl bg-white border p-1.5 transition-all cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-primary ring-2 ring-primary/20 shadow-xs'
                      : 'border-border-subtle hover:border-slate-400'
                  }`}
                >
                  <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}

          {product.description && (
            <div className="bg-white border border-border-subtle rounded-xl p-4 text-xs space-y-2 text-text-secondary">
              <div className="font-bold text-text-primary flex items-center gap-1.5 text-xs">
                <span className="material-symbols-outlined text-[17px] text-primary">
                  description
                </span>
                Mô tả sản phẩm
              </div>
              <p className="leading-relaxed text-slate-700 whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Pricing, Storage, Color, Buy buttons, Specs Table (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            {/* Price Banner */}
            <div className="bg-gradient-to-r from-red-50 via-rose-50/50 to-amber-50/40 border border-red-100 rounded-2xl p-5 mb-5 shadow-xs">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl font-extrabold text-badge-discount">
                  {formatVndPrice(currentPrice)}
                </span>
                {loadingSku && (
                  <span className="text-xs text-primary font-semibold animate-pulse">
                    Đang đồng bộ SKU...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2 text-xs text-slate-700 font-semibold">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">inventory_2</span>
                <span>Số lượng có sẵn trong kho: <strong>{selectedVariant?.stock ?? 0} sản phẩm</strong></span>
              </div>
            </div>

            {/* Storage Selection (ROM) */}
            {storages.length > 0 && (
              <div className="mb-5">
                <div className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>1. Chọn dung lượng bộ nhớ:</span>
                  <span className="text-primary font-bold">{selectedVariant?.storage}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {storages.map((st) => {
                    const isSelected = selectedVariant?.storage === st;
                    const sampleVar = variants.find(
                      (v) =>
                        v.storage === st &&
                        (!selectedVariant?.color || v.color === selectedVariant.color),
                    );
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleSelectOption(undefined, st)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-blue-50/70 ring-2 ring-primary/30 shadow-xs'
                            : 'border-border-subtle bg-white hover:border-primary/50'
                        }`}
                      >
                        <div className="text-sm font-bold text-text-primary">{st}</div>
                        {sampleVar && (
                          <div className="text-xs text-badge-discount font-bold mt-1">
                            {formatVndPrice(sampleVar.price)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {colors.length > 0 && (
              <div className="mb-5">
                <div className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>2. Chọn màu sắc:</span>
                  <span className="text-primary font-bold">{selectedVariant?.color}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {colors.map((col) => {
                    const isSelected = selectedVariant?.color === col;
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => handleSelectOption(col, undefined)}
                        className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-blue-50/70 text-primary ring-2 ring-primary/30 shadow-xs'
                            : 'border-border-subtle bg-white text-text-primary hover:border-primary/50'
                        }`}
                      >
                        <span>{col}</span>
                        {isSelected && (
                          <span className="material-symbols-outlined text-[16px] text-primary">
                            check_circle
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons Cluster */}
            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={() => onAddToCart(product, selectedVariant, true)}
                className="w-full py-4 bg-badge-discount hover:bg-red-600 text-white font-extrabold text-base rounded-xl shadow-lg hover:shadow-xl transition-all flex flex-col items-center justify-center cursor-pointer active:scale-98"
              >
                <span>MUA NGAY</span>
                <span className="text-xs font-normal opacity-90">
                  Giao tận nơi hoặc nhận tại cửa hàng
                </span>
              </button>
              <button
                type="button"
                onClick={() => onAddToCart(product, selectedVariant, false)}
                className="w-full py-3 bg-white border border-primary text-primary hover:bg-blue-50 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                <span>Thêm vào giỏ hàng</span>
              </button>
            </div>

            {/* Tech Specifications Table */}
            {Object.keys(specs).length > 0 && (
              <div className="bg-white border border-border-subtle rounded-2xl overflow-hidden shadow-xs mt-6">
                <div className="bg-slate-50 px-4 py-3 font-bold text-sm text-text-primary border-b border-border-subtle flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">memory</span>
                    Thông số kỹ thuật {product.name}
                  </span>
                  <span className="text-[11px] text-primary font-bold">VN/A Chuẩn</span>
                </div>
                <div className="divide-y divide-border-subtle text-xs">
                  {Object.entries(specs).map(([key, val]) => (
                    <div key={key} className="grid grid-cols-12 px-4 py-2.5 hover:bg-slate-50/50">
                      <span className="col-span-5 text-text-secondary font-medium">
                        {SPEC_LABELS[key] || key}
                      </span>
                      <span className="col-span-7 font-bold text-text-primary">
                        {typeof val === 'boolean'
                          ? val
                            ? 'Có hỗ trợ'
                            : 'Không'
                          : String(val)}
                      </span>
                    </div>
                  ))}
                  {selectedVariant?.storage && (
                    <div className="grid grid-cols-12 px-4 py-2.5 hover:bg-slate-50/50">
                      <span className="col-span-5 text-text-secondary font-medium">Bộ nhớ lưu trữ</span>
                      <span className="col-span-7 font-bold text-text-primary">{selectedVariant.storage}</span>
                    </div>
                  )}
                  {selectedVariant?.color && (
                    <div className="grid grid-cols-12 px-4 py-2.5 hover:bg-slate-50/50">
                      <span className="col-span-5 text-text-secondary font-medium">Màu sắc phiên bản</span>
                      <span className="col-span-7 font-bold text-text-primary">{selectedVariant.color}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= PRODUCT REVIEWS & RATINGS SECTION ================= */}
      <section
        id="product-reviews"
        className="mt-10 bg-white border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xs space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border-subtle">
          <h2 className="text-base sm:text-lg font-extrabold text-text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">reviews</span>
            Đánh giá &amp; Nhận xét {product.name}
          </h2>
          <span className="text-xs text-text-secondary font-medium">
            100% đánh giá xác thực từ khách hàng đã nhận hàng
          </span>
        </div>

        {/* Rating Overview + Breakdown Bars */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-slate-50/80 border border-border-subtle rounded-2xl p-5">
          {/* Average Score */}
          <div className="md:col-span-4 text-center md:border-r md:border-border-subtle md:pr-6">
            <div className="text-4xl font-black text-text-primary">
              {ratingStats.total > 0 ? ratingStats.average : '5.0'}
              <span className="text-lg font-bold text-text-secondary">/5</span>
            </div>
            <div className="mt-1 flex justify-center">
              {renderStars(ratingStats.total > 0 ? ratingStats.average : 5, 'text-[22px]')}
            </div>
            <p className="text-xs text-text-secondary mt-1.5 font-medium">
              {ratingStats.total > 0
                ? `Dựa trên ${ratingStats.total} lượt đánh giá thực tế`
                : 'Hãy là người đầu tiên đánh giá sản phẩm này'}
            </p>
          </div>

          {/* 5-Star Distribution Bars */}
          <div className="md:col-span-8 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingStats.counts[star] || 0;
              const pct = ratingStats.total > 0 ? Math.round((count / ratingStats.total) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setStarFilter((prev) => (prev === star ? null : star))}
                    className={`w-14 flex items-center gap-1 font-bold cursor-pointer hover:text-primary ${
                      starFilter === star ? 'text-primary' : 'text-text-primary'
                    }`}
                  >
                    <span>{star}</span>
                    <span
                      className="material-symbols-outlined text-[14px] text-amber-400"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  </button>
                  <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-[11px] text-text-secondary font-medium">
                    {count} đánh giá
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feedback Banner */}
        {reviewFeedback && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              reviewFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-badge-discount border border-red-200'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {reviewFeedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{reviewFeedback.text}</span>
          </div>
        )}

        {/* Write Review Box (Verified Buyer Eligibility) */}
        {!currentUser ? (
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-text-primary">
              <span className="material-symbols-outlined text-primary text-[22px]">
                verified_user
              </span>
              <span>
                Đăng nhập tài khoản để gửi đánh giá nếu bạn đã mua <strong>{product.name}</strong> tại TecoStore.
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login', { state: { from: `/product/${product.slug}` } })}
              className="px-4 py-2 bg-primary hover:bg-surface-tint text-white font-bold rounded-lg transition-all cursor-pointer flex-shrink-0"
            >
              Đăng nhập ngay
            </button>
          </div>
        ) : eligibleDeliveredOrders.length > 0 ? (
          <form
            onSubmit={handleSubmitReview}
            className="border border-primary/30 bg-blue-50/25 rounded-2xl p-5 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">
                  rate_review
                </span>
                Viết đánh giá trải nghiệm của bạn
              </h3>

              {eligibleDeliveredOrders.length > 1 ? (
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border-subtle bg-white font-semibold"
                >
                  {eligibleDeliveredOrders.map((ord) => (
                    <option key={ord._id} value={ord._id}>
                      Đơn hàng {ord.orderCode}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  ✓ Đã mua tại đơn {eligibleDeliveredOrders[0].orderCode}
                </span>
              )}
            </div>

            {/* Interactive Star Rating Picker */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-text-primary">Mức độ hài lòng:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= (hoverRating || newRating);
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setNewRating(star)}
                      className="p-0.5 cursor-pointer transition-transform hover:scale-110"
                    >
                      <span
                        className={`material-symbols-outlined text-[28px] ${
                          active ? 'text-amber-400' : 'text-slate-300'
                        }`}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-bold text-amber-600">
                {RATING_LABELS[hoverRating || newRating]} ({hoverRating || newRating}/5)
              </span>
            </div>

            <div>
              <textarea
                rows={3}
                maxLength={1000}
                required
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Chia sẻ cảm nhận thực tế của bạn về thiết kế, hiệu năng, pin, camera của sản phẩm..."
                className="w-full p-3.5 rounded-xl border border-border-subtle bg-white text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-text-secondary">
                  {newComment.length}/1000 ký tự
                </span>
                <button
                  type="submit"
                  disabled={submittingReview || !newComment.trim()}
                  className="px-5 py-2.5 bg-primary hover:bg-surface-tint disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>{submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}</span>
                </button>
              </div>
            </div>
          </form>
        ) : inProgressProductOrders.length > 0 ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-amber-600">
              local_shipping
            </span>
            <span>
              Bạn có đơn hàng chứa sản phẩm này đang trong quá trình xử lý/giao hàng. Sau khi đơn chuyển sang trạng thái <strong>Giao thành công</strong>, bạn có thể gửi đánh giá tại đây!
            </span>
          </div>
        ) : hasAlreadyReviewedProduct ? (
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">
              verified
            </span>
            <span>
              Bạn đã đánh giá sản phẩm này. Bạn có thể chỉnh sửa hoặc xóa nhận xét của mình ngay bên dưới.
            </span>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-border-subtle text-text-secondary text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-slate-500">info</span>
            <span>
              Chỉ khách hàng đã mua và nhận hàng thành công sản phẩm này mới có thể viết đánh giá.
            </span>
          </div>
        )}

        {/* Filter Chips */}
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <span className="text-xs font-bold text-text-secondary mr-1">Lọc theo:</span>
            <button
              type="button"
              onClick={() => setStarFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                starFilter === null
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-text-primary border-border-subtle hover:border-primary'
              }`}
            >
              Tất cả ({reviews.length})
            </button>
            {[5, 4, 3, 2, 1].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setStarFilter((prev) => (prev === star ? null : star))}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                  starFilter === star
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-text-primary border-border-subtle hover:border-primary'
                }`}
              >
                <span>{star} Sao</span>
                <span className="opacity-75">({ratingStats.counts[star] || 0})</span>
              </button>
            ))}
          </div>
        )}

        {/* Reviews List */}
        {loadingReviews ? (
          <div className="py-10 text-center text-xs text-text-secondary">
            <span className="material-symbols-outlined text-[28px] animate-spin text-primary">
              progress_activity
            </span>
            <p className="mt-2">Đang tải đánh giá sản phẩm...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="py-10 text-center text-xs text-text-secondary">
            <span className="material-symbols-outlined text-[42px] text-slate-300">
              chat_bubble_outline
            </span>
            <p className="mt-2 font-semibold text-text-primary">
              {starFilter !== null
                ? `Chưa có đánh giá mức ${starFilter} sao nào.`
                : 'Chưa có nhận xét nào cho sản phẩm này.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filteredReviews.map((rev) => {
              const isOwn = Boolean(currentUserId && String(rev.userId) === currentUserId);
              const isEditing = editingReviewId === rev._id;
              const authorName = isOwn
                ? currentUser?.fullName || currentUser?.fullname || 'Bạn'
                : `Khách hàng #${String(rev.userId).slice(-4).toUpperCase()}`;

              return (
                <div key={rev._id} className="py-5 first:pt-2 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                          isOwn
                            ? 'bg-primary text-white'
                            : 'bg-slate-100 text-slate-700 border border-border-subtle'
                        }`}
                      >
                        {authorName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-text-primary">
                            {authorName}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <span className="material-symbols-outlined text-[12px]">
                              check_circle
                            </span>
                            Đã mua tại TecoStore
                          </span>
                          {isOwn && (
                            <span className="text-[10px] font-bold text-primary bg-blue-50 px-2 py-0.5 rounded-full">
                              Đánh giá của bạn
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {renderStars(rev.rating, 'text-[14px]')}
                          {rev.createdAt && (
                            <span className="text-[11px] text-text-secondary">
                              • {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isOwn && !isEditing && (
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleStartEditReview(rev)}
                          className="text-primary hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                          Sửa
                        </button>
                        <button
                          type="button"
                          disabled={deletingReviewId === rev._id}
                          onClick={() => void handleDeleteReview(rev._id)}
                          className="text-badge-discount hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                          {deletingReviewId === rev._id ? 'Đang xóa...' : 'Xóa'}
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="pl-12 space-y-3">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setEditRating(star)}
                            className="cursor-pointer"
                          >
                            <span
                              className={`material-symbols-outlined text-[22px] ${
                                star <= editRating ? 'text-amber-400' : 'text-slate-300'
                              }`}
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              star
                            </span>
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={3}
                        maxLength={1000}
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        className="w-full p-3 rounded-xl border border-border-subtle text-xs focus:outline-none focus:border-primary"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={updatingReview}
                          onClick={() => void handleSaveEditReview(rev._id)}
                          className="px-4 py-1.5 bg-primary text-white font-bold text-xs rounded-lg cursor-pointer"
                        >
                          {updatingReview ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingReviewId(null)}
                          className="px-4 py-1.5 bg-slate-100 text-text-secondary font-bold text-xs rounded-lg cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="pl-12 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {rev.comment}
                    </p>
                  )}

                  {/* Official Shop Replies */}
                  {rev.replies && rev.replies.length > 0 && (
                    <div className="ml-12 space-y-2">
                      {rev.replies.map((rep) => (
                        <div
                          key={rep._id}
                          className="bg-slate-50 border-l-4 border-primary rounded-r-xl p-3.5 text-xs space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-primary flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px]">
                                support_agent
                              </span>
                              Phản hồi từ TecoStore
                            </span>
                            {rep.createdAt && (
                              <span className="text-[10px] text-text-secondary">
                                • {new Date(rep.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-700 leading-relaxed">{rep.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
