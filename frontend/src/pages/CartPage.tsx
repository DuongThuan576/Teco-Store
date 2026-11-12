import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartItem, CustomerInfo, Order, PaymentMethod, User } from '../types/api';
import { formatVndPrice, getProductImage, ordersApi } from '../services/api';

interface CartPageProps {
  cartItems: CartItem[];
  currentUser: User | null;
  onUpdateQuantity: (itemId: string, newQty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearSelected: (itemIds: string[]) => void;
  onOrderSuccess: (order: Order) => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  cartItems,
  currentUser,
  onUpdateQuantity,
  onRemoveItem,
  onClearSelected,
  onOrderSuccess,
}) => {
  const navigate = useNavigate();

  // Current Step: 1 = Cart, 2 = Checkout Form, 3 = Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    cartItems.map((item) => item.id),
  );

  // Keep selectedIds in sync when cartItems change
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => cartItems.some((item) => item.id === id)));
  }, [cartItems]);

  const [promoCode, setPromoCode] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  // Delivery form state (tự động lấy thông tin từ currentUser, thông tin thiếu để trống cho user nhập)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    fullName: currentUser?.fullName || currentUser?.fullname || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    shippingAddress: '',
    city: '',
    district: '',
    note: '',
  });

  // Re-sync customerInfo when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setCustomerInfo((prev) => ({
        ...prev,
        fullName: prev.fullName || currentUser.fullName || currentUser.fullname || '',
        email: prev.email || currentUser.email || '',
        phone: prev.phone || currentUser.phone || '',
      }));
    }
  }, [currentUser]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [submittingOrder, setSubmittingOrder] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const isAllSelected =
    cartItems.length > 0 && selectedIds.length === cartItems.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cartItems.map((item) => item.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    onClearSelected(selectedIds);
    setSelectedIds([]);
  };

  const selectedItems = cartItems.filter((item) =>
    selectedIds.includes(item.id),
  );

  const subtotal = selectedItems.reduce((acc, item) => {
    const itemPrice = item.variant?.price || 0;
    return acc + itemPrice * item.quantity;
  }, 0);

  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim().toUpperCase() === 'TECO2026') {
      const discount = Math.min(500000, Math.round(subtotal * 0.1));
      setDiscountAmount(discount);
      setPromoMessage(`Áp dụng thành công mã TECO2026: Giảm ${discount.toLocaleString('vi-VN')}₫`);
    } else if (promoCode.trim().length > 0) {
      setPromoMessage('Mã giảm giá không hợp lệ hoặc đã hết lượt dùng');
      setDiscountAmount(0);
    }
  };

  // Proceed to Step 2 (Checkout)
  const handleProceedToCheckout = () => {
    if (!currentUser) {
      navigate('/login', {
        state: {
          from: '/cart',
          message: 'Vui lòng đăng nhập để tiến hành đặt hàng và thanh toán.',
        },
      });
      return;
    }

    if (selectedItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm để đặt hàng');
      return;
    }

    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit Order to Backend API /api/orders
  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);

    if (!customerInfo.fullName.trim() || !customerInfo.phone.trim() || !customerInfo.shippingAddress.trim()) {
      setOrderError('Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ nhận hàng.');
      return;
    }

    setSubmittingOrder(true);

    try {
      const itemsPayload = selectedItems.map((item) => ({
        productId: item.product._id,
        sku: item.variant?.sku || '',
        quantity: item.quantity,
      }));

      const res = await ordersApi.createOrder({
        customerInfo,
        items: itemsPayload,
        paymentMethod,
        promoCode: discountAmount > 0 ? promoCode : undefined,
        discountAmount,
        merchantInfo: {
          channel: 'web_tecostore',
          merchantNote: 'Thông tin merchant thanh toán sẽ được cập nhật sau',
        },
      });

      setPlacedOrder(res.order);
      onOrderSuccess(res.order);

      // Remove checked out items from cart state
      onClearSelected(selectedIds);
      setSelectedIds([]);

      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      setOrderError(
        err instanceof Error ? err.message : 'Đặt hàng không thành công. Vui lòng kiểm tra lại.',
      );
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="max-w-[1240px] w-full mx-auto px-4 md:px-margin-desktop py-6">
      {/* Breadcrumb & 3-Step Stepper */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border-subtle mb-6">
        <nav className="flex items-center space-x-2 text-xs text-text-secondary">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="hover:text-primary flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">home</span>
            Trang chủ
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-text-primary font-semibold">
            {step === 1 && `Giỏ hàng (${cartItems.length})`}
            {step === 2 && 'Đặt hàng & Thanh toán'}
            {step === 3 && 'Hoàn tất đơn hàng'}
          </span>
        </nav>

        {/* 3-Step Stepper */}
        <div className="flex items-center gap-2 sm:gap-4 self-center md:self-auto text-xs font-semibold">
          <div
            onClick={() => step > 1 && setStep(1)}
            className={`flex items-center gap-2 ${
              step >= 1 ? 'text-primary cursor-pointer' : 'text-text-secondary opacity-60'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                step === 1
                  ? 'bg-primary text-white ring-4 ring-blue-100'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {step > 1 ? '✓' : '1'}
            </span>
            <span>1. Giỏ hàng</span>
          </div>
          <div className={`w-8 sm:w-12 h-0.5 ${step >= 2 ? 'bg-primary' : 'bg-border-subtle'}`}></div>
          <div
            className={`flex items-center gap-2 ${
              step >= 2 ? 'text-primary' : 'text-text-secondary opacity-60'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                step === 2
                  ? 'bg-primary text-white ring-4 ring-blue-100'
                  : step > 2
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {step > 2 ? '✓' : '2'}
            </span>
            <span>2. Thông tin & Thanh toán</span>
          </div>
          <div className={`w-8 sm:w-12 h-0.5 ${step === 3 ? 'bg-primary' : 'bg-border-subtle'}`}></div>
          <div
            className={`flex items-center gap-2 ${
              step === 3 ? 'text-primary' : 'text-text-secondary opacity-60'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                step === 3
                  ? 'bg-primary text-white ring-4 ring-blue-100'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </span>
            <span>3. Hoàn tất</span>
          </div>
        </div>
      </div>

      {/* ================= STEP 1: GIỎ HÀNG ================= */}
      {step === 1 && (
        <>
          {cartItems.length === 0 ? (
            <div className="bg-white border border-border-subtle rounded-2xl p-12 text-center my-6 shadow-xs">
              <span className="material-symbols-outlined text-[64px] text-slate-300">
                production_quantity_limits
              </span>
              <h3 className="text-base font-bold text-text-primary mt-3">
                Giỏ hàng của bạn đang trống
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Hãy khám phá các thiết bị công nghệ chính hãng mới nhất tại TecoStore!
              </p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-6 px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-surface-tint transition-all cursor-pointer shadow-md"
              >
                Tiếp tục mua sắm
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: List of Cart Items */}
              <div className="lg:col-span-8 space-y-4">
                {/* Batch Action Toolbar */}
                <div className="bg-white border border-border-subtle rounded-xl p-3.5 flex items-center justify-between shadow-xs text-xs font-semibold">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                    />
                    <span>Chọn tất cả ({cartItems.length} sản phẩm)</span>
                  </label>

                  {selectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="text-badge-discount hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span>Xóa các mục đã chọn ({selectedIds.length})</span>
                    </button>
                  )}
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  {cartItems.map((item, index) => {
                    const isSelected = selectedIds.includes(item.id);
                    const variant = item.variant;
                    const itemPrice = variant?.price || 0;
                    const imageUrl = getProductImage(item.product, index);

                    return (
                      <div
                        key={item.id}
                        className={`bg-white border rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
                          isSelected ? 'border-primary/50' : 'border-border-subtle'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer flex-shrink-0"
                          />
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-surface-page rounded-lg p-2 flex-shrink-0 flex items-center justify-center border border-border-subtle/50">
                            <img
                              src={imageUrl}
                              alt={item.product.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4
                              onClick={() => navigate(`/product/${item.product.slug}`)}
                              className="font-bold text-xs sm:text-sm text-text-primary hover:text-primary transition-colors cursor-pointer line-clamp-2"
                            >
                              {item.product.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary flex-wrap">
                              {variant?.storage && (
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                                  {variant.storage}
                                </span>
                              )}
                              {variant?.color && (
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                                  {variant.color}
                                </span>
                              )}
                              <span className="text-[11px] font-mono text-slate-500">
                                SKU: {variant?.sku || 'N/A'}
                              </span>
                            </div>
                            <div className="text-sm font-extrabold text-badge-discount mt-1 sm:hidden">
                              {formatVndPrice(itemPrice)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0">
                          <div className="hidden sm:block text-right">
                            <span className="text-sm font-extrabold text-badge-discount block">
                              {formatVndPrice(itemPrice)}
                            </span>
                            <span className="text-[10px] text-text-secondary">Đơn giá chuẩn</span>
                          </div>

                          {/* Quantity control */}
                          <div className="flex items-center border border-border-subtle rounded-lg bg-surface-page overflow-hidden">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 text-text-primary transition-colors cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-10 text-center font-bold text-xs">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 text-text-primary transition-colors cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            className="text-slate-400 hover:text-badge-discount transition-colors p-1 cursor-pointer"
                            title="Xóa sản phẩm"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Pricing & Checkout Button */}
              <div className="lg:col-span-4 space-y-4">
                {/* Promo Code Box */}
                <div className="bg-white border border-border-subtle rounded-xl p-4 shadow-xs">
                  <h4 className="font-bold text-sm text-text-primary mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      confirmation_number
                    </span>
                    Mã giảm giá / Voucher
                  </h4>
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Nhập mã (thử: TECO2026)"
                      className="flex-1 uppercase text-xs px-3 py-2 border border-border-subtle rounded-lg focus:border-primary focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-slate-900 hover:bg-primary text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Áp dụng
                    </button>
                  </form>
                  {promoMessage && (
                    <p
                      className={`mt-2 text-xs font-medium ${
                        discountAmount > 0 ? 'text-emerald-600' : 'text-badge-discount'
                      }`}
                    >
                      {promoMessage}
                    </p>
                  )}
                </div>

                {/* Price Summary Card */}
                <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-xs space-y-3.5">
                  <h4 className="font-bold text-base text-text-primary pb-2.5 border-b border-border-subtle">
                    Chi tiết đơn hàng
                  </h4>

                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>Tạm tính ({selectedItems.length} sản phẩm):</span>
                    <span className="font-semibold text-text-primary">
                      {formatVndPrice(subtotal)}
                    </span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-xs text-emerald-600">
                      <span>Khuyến mãi giảm giá:</span>
                      <span className="font-semibold">
                        -{formatVndPrice(discountAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>Phí vận chuyển:</span>
                    <span className="font-semibold text-emerald-600">Miễn phí toàn quốc</span>
                  </div>

                  <div className="pt-3 border-t border-border-subtle flex items-baseline justify-between">
                    <div>
                      <span className="block text-sm font-bold text-text-primary">
                        Tổng cộng:
                      </span>
                      <span className="text-[11px] text-text-secondary">
                        (Đã bao gồm thuế VAT)
                      </span>
                    </div>
                    <span className="text-xl font-black text-badge-discount">
                      {formatVndPrice(finalTotal)}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={selectedItems.length === 0}
                    onClick={handleProceedToCheckout}
                    className="w-full py-3.5 bg-badge-discount hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    <span>Tiến hành đặt hàng ({selectedItems.length})</span>
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </button>

                  {!currentUser && (
                    <p className="text-[11px] text-center text-text-secondary italic">
                      * Bạn cần đăng nhập để hoàn tất đặt hàng
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= STEP 2: THÔNG TIN GIAO HÀNG & THANH TOÁN ================= */}
      {step === 2 && (
        <form onSubmit={handleConfirmOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Delivery Form & Payment Methods */}
          <div className="lg:col-span-7 space-y-6">
            {orderError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-badge-discount text-xs flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[20px]">error</span>
                <span>{orderError}</span>
              </div>
            )}

            {/* Delivery Info Box */}
            <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">local_shipping</span>
                  Thông tin giao hàng
                </h3>
                <span className="text-[11px] text-text-secondary">
                  Dữ liệu đồng bộ từ tài khoản của bạn
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Họ và tên người nhận <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerInfo.fullName}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, fullName: e.target.value })
                    }
                    placeholder="Nguyễn Văn A"
                    className="w-full h-10 px-3.5 rounded-xl border border-border-subtle text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Số điện thoại nhận hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerInfo.phone}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, phone: e.target.value })
                    }
                    placeholder="0912345678"
                    className="w-full h-10 px-3.5 rounded-xl border border-border-subtle text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Địa chỉ Email nhận hóa đơn <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={customerInfo.email}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, email: e.target.value })
                  }
                  placeholder="name@example.com"
                  className="w-full h-10 px-3.5 rounded-xl border border-border-subtle text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Địa chỉ chi tiết nhận hàng (Số nhà, đường, phường/xã) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerInfo.shippingAddress}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, shippingAddress: e.target.value })
                  }
                  placeholder="Số 123 Đường Cầu Giấy, Phường Quan Hoa"
                  className="w-full h-10 px-3.5 rounded-xl border border-border-subtle text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Tỉnh / Thành phố
                  </label>
                  <input
                    type="text"
                    value={customerInfo.city}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, city: e.target.value })
                    }
                    placeholder="Hà Nội / TP. Hồ Chí Minh..."
                    className="w-full h-10 px-3.5 rounded-xl border border-border-subtle text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Quận / Huyện
                  </label>
                  <input
                    type="text"
                    value={customerInfo.district}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, district: e.target.value })
                    }
                    placeholder="Quận Cầu Giấy..."
                    className="w-full h-10 px-3.5 rounded-xl border border-border-subtle text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Ghi chú cho nhân viên giao hàng (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={customerInfo.note}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, note: e.target.value })
                  }
                  placeholder="Giao giờ hành chính, gọi trước khi đến..."
                  className="w-full p-3 rounded-xl border border-border-subtle text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border-subtle pb-3">
                <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
                Phương thức thanh toán
              </h3>

              <div className="space-y-3">
                {/* Method 1: COD */}
                <label
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'cod'
                      ? 'border-primary bg-blue-50/50 ring-2 ring-primary/20'
                      : 'border-border-subtle hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="mt-1 text-primary focus:ring-primary cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs text-text-primary block">
                      Thanh toán khi nhận hàng (COD)
                    </span>
                    <span className="text-[11px] text-text-secondary mt-0.5 block">
                      Khách hàng kiểm tra sản phẩm trước khi thanh toán tiền mặt cho shipper
                    </span>
                  </div>
                </label>

                {/* Method 2: Bank Transfer / Merchant Placeholder */}
                <label
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-primary bg-blue-50/50 ring-2 ring-primary/20'
                      : 'border-border-subtle hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank_transfer"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={() => setPaymentMethod('bank_transfer')}
                    className="mt-1 text-primary focus:ring-primary cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs text-text-primary block">
                      Chuyển khoản Ngân hàng / Quét mã QR
                    </span>
                    <span className="text-[11px] text-text-secondary mt-0.5 block">
                      Tự động xác nhận giao dịch qua tài khoản ngân hàng của TecoStore
                    </span>
                    {paymentMethod === 'bank_transfer' && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">info</span>
                          Thông tin Merchant chuyển khoản:
                        </div>
                        <p>• Đơn vị thụ hưởng: <strong>TECOSTORE TECH RETAIL CO., LTD</strong></p>
                        <p>• <em>(Các thông số merchant và cổng thanh toán đối tác sẽ được cấu hình bổ sung)</em></p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Review Sidebar */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="font-bold text-base text-text-primary pb-3 border-b border-border-subtle flex items-center justify-between">
                <span>Đơn hàng của bạn ({selectedItems.length})</span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Sửa
                </button>
              </h4>

              {/* Items preview */}
              <div className="divide-y divide-border-subtle max-h-72 overflow-y-auto pr-1">
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-text-primary truncate">{item.product.name}</div>
                      <div className="text-[11px] text-text-secondary">
                        {item.variant?.storage} • {item.variant?.color} • SL: x{item.quantity}
                      </div>
                    </div>
                    <span className="font-extrabold text-badge-discount flex-shrink-0">
                      {formatVndPrice((item.variant?.price || 0) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Details */}
              <div className="pt-3 border-t border-border-subtle space-y-2 text-xs">
                <div className="flex justify-between text-text-secondary">
                  <span>Tạm tính:</span>
                  <span className="font-semibold text-text-primary">{formatVndPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Mã giảm giá TECO2026:</span>
                    <span className="font-semibold">-{formatVndPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-text-secondary">
                  <span>Phí vận chuyển:</span>
                  <span className="font-semibold text-emerald-600">Miễn phí</span>
                </div>
                <div className="pt-3 border-t border-border-subtle flex items-baseline justify-between">
                  <span className="text-sm font-bold text-text-primary">Tổng thanh toán:</span>
                  <span className="text-2xl font-black text-badge-discount">
                    {formatVndPrice(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="w-full py-4 bg-badge-discount hover:bg-red-600 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submittingOrder ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">
                        progress_activity
                      </span>
                      <span>Đang tạo đơn hàng...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">check</span>
                      <span>Xác nhận đặt hàng</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full py-2.5 text-xs text-text-secondary hover:text-text-primary font-bold transition-colors cursor-pointer"
                >
                  ← Quay lại giỏ hàng
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ================= STEP 3: XÁC NHẬN HOÀN TẤT ĐẶT HÀNG ================= */}
      {step === 3 && placedOrder && (
        <div className="max-w-2xl mx-auto bg-white border border-border-subtle rounded-3xl p-8 sm:p-10 text-center shadow-lg animate-fadeIn my-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
            <span className="material-symbols-outlined text-[44px]">verified</span>
          </div>

          <h2 className="text-2xl font-extrabold text-text-primary">
            Đặt hàng thành công!
          </h2>
          <p className="text-xs text-text-secondary mt-1.5 max-w-md mx-auto">
            Cảm ơn bạn đã mua sắm tại <strong>TecoStore</strong>. Mã đơn hàng của bạn đã được ghi nhận vào hệ thống.
          </p>

          {/* Order Details Card */}
          <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-border-subtle text-left text-xs space-y-3">
            <div className="flex justify-between items-center pb-2.5 border-b border-border-subtle">
              <span className="text-text-secondary font-medium">Mã đơn hàng:</span>
              <span className="font-mono font-extrabold text-primary text-sm tracking-wide">
                {placedOrder.orderCode}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary font-medium">Người nhận:</span>
              <span className="font-bold text-text-primary">{placedOrder.customerInfo.fullName} ({placedOrder.customerInfo.phone})</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-text-secondary font-medium flex-shrink-0">Địa chỉ giao:</span>
              <span className="font-medium text-text-primary text-right pl-4">
                {placedOrder.customerInfo.shippingAddress}
                {placedOrder.customerInfo.district ? `, ${placedOrder.customerInfo.district}` : ''}
                {placedOrder.customerInfo.city ? `, ${placedOrder.customerInfo.city}` : ''}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary font-medium">Phương thức:</span>
              <span className="font-bold text-text-primary uppercase">
                {placedOrder.paymentMethod === 'cod' ? 'Thanh toán tiền mặt (COD)' : 'Chuyển khoản ngân hàng'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2.5 border-t border-border-subtle text-sm">
              <span className="font-bold text-text-primary">Tổng tiền thanh toán:</span>
              <span className="font-black text-badge-discount text-lg">
                {formatVndPrice(placedOrder.totalAmount)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/account')}
              className="px-6 py-3 bg-primary text-white font-bold text-xs rounded-xl hover:bg-surface-tint transition-all cursor-pointer shadow-md"
            >
              Xem đơn hàng trong tài khoản
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-white border border-border-subtle text-text-primary font-bold text-xs rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
            >
              Tiếp tục mua sắm
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
