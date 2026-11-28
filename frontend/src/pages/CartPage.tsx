import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Address,
  CartItem,
  CreateAddressDTO,
  Order,
  PaymentMethod,
  User,
  Voucher,
} from '../types/api';
import {
  addressesApi,
  cartApi,
  formatVndPrice,
  getProductImage,
  ordersApi,
  paymentsApi,
  vouchersApi,
} from '../services/api';

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

  // Current Step: 1 = Cart, 2 = Checkout Form, 3 = Confirmation (COD or VNPay fallback)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    cartItems.map((item) => item.id),
  );

  // Sync selectedIds when cartItems load or change
  useEffect(() => {
    setSelectedIds((prev) => {
      const validPrev = prev.filter((id) => cartItems.some((item) => item.id === id));
      if (validPrev.length === 0 && cartItems.length > 0 && prev.length === 0) {
        return cartItems.map((item) => item.id);
      }
      return validPrev;
    });
  }, [cartItems]);

  // ================= VOUCHER STATE (BACKEND MONGODB) =================
  const [walletVouchers, setWalletVouchers] = useState<Voucher[]>([]);
  const [loadingWallet, setLoadingWallet] = useState<boolean>(false);
  const [promoCode, setPromoCode] = useState<string>('');
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [validatingPromo, setValidatingPromo] = useState<boolean>(false);
  const [promoMessage, setPromoMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Load user's available vouchers from Backend /api/vouchers/my-wallet
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'customer') {
      setWalletVouchers([]);
      return;
    }
    let mounted = true;
    setLoadingWallet(true);
    vouchersApi
      .getMyWallet()
      .then((res) => {
        if (mounted) {
          setWalletVouchers(res.vouchers || []);
        }
      })
      .catch(() => {
        if (mounted) setWalletVouchers([]);
      })
      .finally(() => {
        if (mounted) setLoadingWallet(false);
      });
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  // ================= ADDRESS STATE (/api/addresses) =================
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState<boolean>(false);
  const [addressMode, setAddressMode] = useState<'saved' | 'new'>('new');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  const [newAddressForm, setNewAddressForm] = useState<CreateAddressDTO>({
    receiverName: currentUser?.fullName || currentUser?.fullname || '',
    phone: currentUser?.phone || '',
    province: 'TP. Hồ Chí Minh',
    district: '',
    ward: '',
    address: '',
  });
  const [orderNote, setOrderNote] = useState<string>('');

  useEffect(() => {
    if (currentUser) {
      setNewAddressForm((prev) => ({
        ...prev,
        receiverName: prev.receiverName || currentUser.fullName || currentUser.fullname || '',
        phone: prev.phone || currentUser.phone || '',
      }));
    }
  }, [currentUser]);

  // Fetch saved addresses when user enters Step 2 (or logs in)
  useEffect(() => {
    if (!currentUser) {
      setSavedAddresses([]);
      return;
    }
    let mounted = true;
    setLoadingAddresses(true);
    addressesApi
      .getMyAddresses()
      .then((list) => {
        if (!mounted) return;
        const arr = Array.isArray(list) ? list : [];
        setSavedAddresses(arr);
        if (arr.length > 0) {
          const defaultAddr = arr.find((a) => a.isDefault) || arr[0];
          setSelectedAddressId(defaultAddr._id);
          setAddressMode('saved');
        } else {
          setAddressMode('new');
        }
      })
      .catch(() => {
        if (mounted) {
          setSavedAddresses([]);
          setAddressMode('new');
        }
      })
      .finally(() => {
        if (mounted) setLoadingAddresses(false);
      });
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  // ================= PAYMENT & ORDER SUBMISSION STATE =================
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [submittingOrder, setSubmittingOrder] = useState<boolean>(false);
  const [redirectingVnpay, setRedirectingVnpay] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [vnpayRedirectError, setVnpayRedirectError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  // Selection helpers
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

  const selectedItems = cartItems.filter((item) => selectedIds.includes(item.id));

  const subtotal = selectedItems.reduce((acc, item) => {
    const itemPrice = item.variant?.price || 0;
    return acc + itemPrice * item.quantity;
  }, 0);

  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Re-validate applied voucher automatically if cart subtotal changes
  useEffect(() => {
    if (!appliedVoucherCode) return;
    if (selectedItems.length === 0) {
      setAppliedVoucherCode(null);
      setDiscountAmount(0);
      setPromoMessage(null);
      return;
    }

    let cancelled = false;
    vouchersApi
      .validateVoucher(appliedVoucherCode)
      .then((res) => {
        if (cancelled) return;
        setDiscountAmount(res.discountAmount);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAppliedVoucherCode(null);
        setDiscountAmount(0);
        setPromoMessage({
          type: 'error',
          text:
            err instanceof Error
              ? err.message
              : 'Mã giảm giá không còn đủ điều kiện áp dụng cho giỏ hàng hiện tại.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [subtotal, selectedItems.length, appliedVoucherCode]);

  // Apply voucher via Backend POST /api/vouchers/validate
  const applyVoucherByCode = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    if (!currentUser) {
      navigate('/login', {
        state: {
          from: '/cart',
          message: 'Vui lòng đăng nhập để kiểm tra và áp dụng mã giảm giá.',
        },
      });
      return;
    }

    setValidatingPromo(true);
    setPromoMessage(null);

    try {
      const res = await vouchersApi.validateVoucher(code);
      setPromoCode(res.voucher.code);
      setAppliedVoucherCode(res.voucher.code);
      setDiscountAmount(res.discountAmount);
      setPromoMessage({
        type: 'success',
        text: `Áp dụng mã ${res.voucher.code} thành công: Giảm ${formatVndPrice(res.discountAmount)}!`,
      });
    } catch (err: unknown) {
      setAppliedVoucherCode(null);
      setDiscountAmount(0);
      setPromoMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Mã giảm giá không hợp lệ hoặc đã hết lượt dùng.',
      });
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    void applyVoucherByCode(promoCode);
  };

  const handleRemovePromo = () => {
    setAppliedVoucherCode(null);
    setDiscountAmount(0);
    setPromoCode('');
    setPromoMessage(null);
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

    setOrderError(null);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Retry VNPay redirect if Order was already created
  const handleRetryVnpayPayment = async (orderId: string) => {
    setRedirectingVnpay(true);
    setVnpayRedirectError(null);
    try {
      const vnpayRes = await paymentsApi.createVnpayUrl(orderId);
      window.location.href = vnpayRes.paymentUrl;
    } catch (err: unknown) {
      setRedirectingVnpay(false);
      setVnpayRedirectError(
        err instanceof Error
          ? err.message
          : 'Không thể khởi tạo liên kết thanh toán VNPay. Bạn có thể thanh toán lại trong mục Đơn hàng.',
      );
    }
  };

  // Submit Order to Backend API POST /api/orders (+ VNPay redirect if selected)
  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);
    setVnpayRedirectError(null);

    let finalAddressId = selectedAddressId;

    // Validate address inputs
    if (addressMode === 'saved') {
      if (!finalAddressId) {
        setOrderError('Vui lòng chọn một địa chỉ nhận hàng hoặc thêm địa chỉ mới.');
        return;
      }
    } else {
      const normalizedPhone = newAddressForm.phone.replace(/[\s.-]/g, '');
      if (
        !newAddressForm.receiverName.trim() ||
        !normalizedPhone ||
        !newAddressForm.province.trim() ||
        !newAddressForm.district.trim() ||
        !newAddressForm.ward.trim() ||
        !newAddressForm.address.trim()
      ) {
        setOrderError(
          'Vui lòng điền đầy đủ Họ tên, Số điện thoại, Tỉnh/Thành, Quận/Huyện, Phường/Xã và Địa chỉ chi tiết.',
        );
        return;
      }
      if (!/^0[0-9]{9}$/.test(normalizedPhone)) {
        setOrderError('Số điện thoại nhận hàng phải gồm 10 chữ số và bắt đầu bằng số 0 (VD: 0912345678).');
        return;
      }
    }

    setSubmittingOrder(true);
    const unselectedItems = cartItems.filter((item) => !selectedIds.includes(item.id));

    try {
      // 1. If user entered a new address, save it first via POST /api/addresses to obtain addressId
      if (addressMode === 'new') {
        const normalizedPhone = newAddressForm.phone.replace(/[\s.-]/g, '');
        const createdAddrRes = await addressesApi.createAddress({
          receiverName: newAddressForm.receiverName.trim(),
          phone: normalizedPhone,
          province: newAddressForm.province.trim(),
          district: newAddressForm.district.trim(),
          ward: newAddressForm.ward.trim(),
          address: newAddressForm.address.trim(),
        });
        finalAddressId = createdAddrRes.address._id;
        setSavedAddresses((prev) => [createdAddrRes.address, ...prev]);
        setSelectedAddressId(finalAddressId);
      }

      // 2. If user only selected a subset of cart items, temporarily remove unselected items from backend cart
      //    so Backend OrdersService checks out only the selected items, then restore unselected items afterward.
      if (unselectedItems.length > 0) {
        for (const uItem of unselectedItems) {
          const skuOrVarId = uItem.variant?._id || uItem.variant?.sku;
          if (skuOrVarId) {
            await cartApi.removeItem(skuOrVarId).catch(() => {});
          }
        }
      }

      // 3. Create Order via POST /api/orders (ACID Transaction + Atomic Stock Lock + Voucher Reservation)
      const createdOrder = await ordersApi.createOrder({
        addressId: finalAddressId,
        paymentMethod,
        ...(appliedVoucherCode ? { voucherCode: appliedVoucherCode } : {}),
        ...(orderNote.trim() ? { note: orderNote.trim() } : {}),
      });

      // 4. Restore unselected items back to backend cart if any
      if (unselectedItems.length > 0) {
        for (const uItem of unselectedItems) {
          if (uItem.variant?.sku) {
            await cartApi
              .addItem(uItem.product._id, uItem.variant.sku, uItem.quantity, uItem.variant._id)
              .catch(() => {});
          }
        }
      }

      setPlacedOrder(createdOrder);
      onOrderSuccess(createdOrder);
      setSelectedIds([]);

      // 5. If paymentMethod is VNPay -> Call POST /api/payments/vnpay/create-url and redirect browser!
      if (paymentMethod === 'vnpay') {
        setRedirectingVnpay(true);
        try {
          const vnpayRes = await paymentsApi.createVnpayUrl(createdOrder._id);
          window.location.href = vnpayRes.paymentUrl;
          return;
        } catch (vnpErr: unknown) {
          setRedirectingVnpay(false);
          setVnpayRedirectError(
            vnpErr instanceof Error
              ? vnpErr.message
              : 'Đơn hàng đã được tạo nhưng chưa thể chuyển hướng sang cổng VNPay.',
          );
          setStep(3);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }

      // 6. COD Order -> Show Step 3 Confirmation screen
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      // Restore unselected items if order creation failed
      if (unselectedItems.length > 0) {
        for (const uItem of unselectedItems) {
          if (uItem.variant?.sku) {
            await cartApi
              .addItem(uItem.product._id, uItem.variant.sku, uItem.quantity, uItem.variant._id)
              .catch(() => {});
          }
        }
      }
      setOrderError(
        err instanceof Error ? err.message : 'Đặt hàng không thành công. Vui lòng kiểm tra lại.',
      );
    } finally {
      setSubmittingOrder(false);
    }
  };

  const renderVoucherWallet = () => {
    if (!currentUser || currentUser.role !== 'customer') return null;

    if (loadingWallet) {
      return (
        <div className="mt-3 text-[11px] text-text-secondary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px] animate-spin text-primary">
            progress_activity
          </span>
          <span>Đang tải kho voucher khả dụng...</span>
        </div>
      );
    }

    if (walletVouchers.length === 0) return null;

    return (
      <div className="mt-3 pt-3 border-t border-border-subtle space-y-2">
        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
          Kho Voucher khả dụng ({walletVouchers.length}):
        </span>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {walletVouchers.map((v) => {
            const isEligible = subtotal >= v.minOrderAmount;
            const isApplied = appliedVoucherCode === v.code;
            const discountText =
              v.discountType === 'percentage'
                ? `Giảm ${v.discountValue}%${
                    v.maxDiscountAmount ? ` (tối đa ${formatVndPrice(v.maxDiscountAmount)})` : ''
                  }`
                : `Giảm trực tiếp ${formatVndPrice(v.discountValue)}`;

            return (
              <div
                key={v._id}
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
                  isApplied
                    ? 'border-emerald-500 bg-emerald-50/60'
                    : isEligible
                    ? 'border-blue-200 bg-blue-50/30 hover:border-primary'
                    : 'border-border-subtle bg-slate-50 opacity-65'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-extrabold text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {v.code}
                    </span>
                    <span className="font-bold text-text-primary text-[11px] truncate">
                      {discountText}
                    </span>
                  </div>
                  <div className="text-[10px] text-text-secondary mt-0.5">
                    Đơn tối thiểu: {formatVndPrice(v.minOrderAmount)}
                    {v.remainingUses !== undefined ? ` • Còn ${v.remainingUses} lượt` : ''}
                  </div>
                </div>

                {isApplied ? (
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex-shrink-0 cursor-pointer hover:bg-emerald-700"
                  >
                    Đã chọn ✓
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!isEligible || validatingPromo}
                    onClick={() => void applyVoucherByCode(v.code)}
                    className="px-2.5 py-1 rounded-lg bg-primary text-white font-bold text-[11px] flex-shrink-0 disabled:opacity-40 hover:bg-surface-tint cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isEligible ? 'Dùng ngay' : 'Chưa đủ ĐK'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
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
            onClick={() => step === 2 && !submittingOrder && setStep(1)}
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
            <span>2. Địa chỉ &amp; Thanh toán</span>
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

              {/* Right Column: Voucher & Checkout Summary */}
              <div className="lg:col-span-4 space-y-4">
                {/* Real Voucher Box */}
                <div className="bg-white border border-border-subtle rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        confirmation_number
                      </span>
                      Mã giảm giá / Voucher
                    </h4>
                    {appliedVoucherCode && (
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="text-[11px] text-badge-discount font-bold hover:underline cursor-pointer"
                      >
                        Gỡ mã
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Nhập mã voucher (VD: TECO10)"
                      className="flex-1 uppercase text-xs px-3 py-2 border border-border-subtle rounded-lg focus:border-primary focus:outline-none font-semibold"
                    />
                    <button
                      type="submit"
                      disabled={validatingPromo || !promoCode.trim()}
                      className="px-4 py-2 bg-slate-900 hover:bg-primary disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      {validatingPromo ? 'Đang KT...' : 'Áp dụng'}
                    </button>
                  </form>

                  {promoMessage && (
                    <div
                      className={`mt-2.5 p-2.5 rounded-lg text-xs font-medium flex items-start gap-1.5 ${
                        promoMessage.type === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-badge-discount border border-red-200'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] flex-shrink-0">
                        {promoMessage.type === 'success' ? 'check_circle' : 'error'}
                      </span>
                      <span>{promoMessage.text}</span>
                    </div>
                  )}

                  {renderVoucherWallet()}
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

                  {discountAmount > 0 && appliedVoucherCode && (
                    <div className="flex items-center justify-between text-xs text-emerald-600">
                      <span>Voucher ({appliedVoucherCode}):</span>
                      <span className="font-bold">-{formatVndPrice(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>Phí vận chuyển:</span>
                    <span className="font-semibold text-emerald-600">Miễn phí toàn quốc</span>
                  </div>

                  <div className="pt-3 border-t border-border-subtle flex items-baseline justify-between">
                    <div>
                      <span className="block text-sm font-bold text-text-primary">Tổng cộng:</span>
                      <span className="text-[11px] text-text-secondary">(Đã bao gồm thuế VAT)</span>
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
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>

                  {!currentUser && (
                    <p className="text-[11px] text-center text-text-secondary italic">
                      * Bạn cần đăng nhập tài khoản Khách hàng để đặt hàng
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= STEP 2: ĐỊA CHỈ NHẬN HÀNG & PHƯƠNG THỨC THANH TOÁN ================= */}
      {step === 2 && (
        <form onSubmit={handleConfirmOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Delivery Address & Payment Methods */}
          <div className="lg:col-span-7 space-y-6">
            {orderError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-badge-discount text-xs flex items-center gap-2.5 font-medium">
                <span className="material-symbols-outlined text-[20px]">error</span>
                <span>{orderError}</span>
              </div>
            )}

            {/* Delivery Info Box */}
            <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3 flex-wrap gap-2">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    local_shipping
                  </span>
                  Địa chỉ giao hàng
                </h3>

                {savedAddresses.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setAddressMode('saved')}
                      className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                        addressMode === 'saved'
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                      }`}
                    >
                      Sổ địa chỉ ({savedAddresses.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddressMode('new')}
                      className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                        addressMode === 'new'
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                      }`}
                    >
                      + Địa chỉ mới
                    </button>
                  </div>
                )}
              </div>

              {loadingAddresses ? (
                <div className="py-6 text-center text-xs text-text-secondary flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px] animate-spin text-primary">
                    progress_activity
                  </span>
                  <span>Đang tải sổ địa chỉ của bạn...</span>
                </div>
              ) : addressMode === 'saved' && savedAddresses.length > 0 ? (
                <div className="space-y-3">
                  {savedAddresses.map((addr) => {
                    const isChecked = selectedAddressId === addr._id;
                    return (
                      <label
                        key={addr._id}
                        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'border-primary bg-blue-50/40 ring-2 ring-primary/15'
                            : 'border-border-subtle hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="selectedAddress"
                          checked={isChecked}
                          onChange={() => setSelectedAddressId(addr._id)}
                          className="mt-1 text-primary focus:ring-primary cursor-pointer"
                        />
                        <div className="flex-1 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-text-primary text-sm">
                              {addr.receiverName}
                            </span>
                            <span className="text-slate-400">|</span>
                            <span className="font-semibold text-text-secondary">{addr.phone}</span>
                            {addr.isDefault && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                Mặc định
                              </span>
                            )}
                          </div>
                          <p className="text-text-secondary mt-1">
                            {addr.address}, {addr.ward}, {addr.district}, {addr.province}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-text-primary mb-1">
                        Họ và tên người nhận <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newAddressForm.receiverName}
                        onChange={(e) =>
                          setNewAddressForm({ ...newAddressForm, receiverName: e.target.value })
                        }
                        placeholder="Nguyễn Văn A"
                        className="w-full h-10 px-3.5 rounded-xl border border-border-subtle text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-primary mb-1">
                        Số điện thoại (10 số) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={newAddressForm.phone}
                        onChange={(e) =>
                          setNewAddressForm({ ...newAddressForm, phone: e.target.value })
                        }
                        placeholder="0912345678"
                        className="w-full h-10 px-3.5 rounded-xl border border-border-subtle text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-text-primary mb-1">
                        Tỉnh / Thành phố <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newAddressForm.province}
                        onChange={(e) =>
                          setNewAddressForm({ ...newAddressForm, province: e.target.value })
                        }
                        placeholder="TP. Hồ Chí Minh / Hà Nội"
                        className="w-full h-10 px-3.5 rounded-xl border border-border-subtle text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-primary mb-1">
                        Quận / Huyện <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newAddressForm.district}
                        onChange={(e) =>
                          setNewAddressForm({ ...newAddressForm, district: e.target.value })
                        }
                        placeholder="Quận 1 / Quận Cầu Giấy"
                        className="w-full h-10 px-3.5 rounded-xl border border-border-subtle text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-primary mb-1">
                        Phường / Xã <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newAddressForm.ward}
                        onChange={(e) =>
                          setNewAddressForm({ ...newAddressForm, ward: e.target.value })
                        }
                        placeholder="Phường Bến Nghé"
                        className="w-full h-10 px-3.5 rounded-xl border border-border-subtle text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-primary mb-1">
                      Số nhà, tên đường cụ thể <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newAddressForm.address}
                      onChange={(e) =>
                        setNewAddressForm({ ...newAddressForm, address: e.target.value })
                      }
                      placeholder="Số 123 Đường Lê Lợi"
                      className="w-full h-10 px-3.5 rounded-xl border border-border-subtle text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-border-subtle">
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Ghi chú cho nhân viên giao hàng (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Giao giờ hành chính, gọi trước khi đến 15 phút..."
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
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs sm:text-sm text-text-primary">
                        Thanh toán khi nhận hàng (COD)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                        TIỀN MẶT
                      </span>
                    </div>
                    <span className="text-[11px] text-text-secondary mt-0.5 block">
                      Khách hàng kiểm tra sản phẩm nguyên seal trước khi thanh toán tiền mặt cho đơn vị vận chuyển.
                    </span>
                  </div>
                </label>

                {/* Method 2: VNPay Online Payment Gateway */}
                <label
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'vnpay'
                      ? 'border-primary bg-blue-50/50 ring-2 ring-primary/20'
                      : 'border-border-subtle hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="vnpay"
                    checked={paymentMethod === 'vnpay'}
                    onChange={() => setPaymentMethod('vnpay')}
                    className="mt-1 text-primary focus:ring-primary cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-text-primary">
                        Thanh toán trực tuyến qua Cổng VNPay (VNPay-QR / Thẻ ATM / Visa)
                      </span>
                      <span className="px-2.5 py-0.5 rounded bg-blue-600 text-white font-extrabold text-[10px] tracking-wide">
                        VNPAY GATEWAY
                      </span>
                    </div>
                    <span className="text-[11px] text-text-secondary mt-0.5 block">
                      Chuyển hướng an toàn tới cổng VNPay (chữ ký số HMAC-SHA512), hỗ trợ quét QR ngân hàng &amp; thẻ nội địa/quốc tế.
                    </span>
                    {paymentMethod === 'vnpay' && (
                      <div className="mt-3 p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-[11px] text-blue-900 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-primary">
                          <span className="material-symbols-outlined text-[16px]">verified_user</span>
                          Quy trình thanh toán bảo mật VNPay:
                        </div>
                        <p>• Sau khi bấm <strong>Thanh toán qua VNPay</strong>, hệ thống sẽ giữ tồn kho đơn hàng trong <strong>15 phút</strong> và chuyển bạn sang trang thanh toán chính thức của VNPay.</p>
                        <p>• Hoàn tất thanh toán xong, VNPay sẽ tự động đưa bạn quay lại trang xác nhận của TecoStore.</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Review & Voucher Sidebar */}
          <div className="lg:col-span-5 space-y-4">
            {/* Voucher Box in Step 2 as well so user can apply/change before placing order */}
            <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    confirmation_number
                  </span>
                  Mã giảm giá áp dụng
                </h4>
                {appliedVoucherCode && (
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="text-[11px] text-badge-discount font-bold hover:underline cursor-pointer"
                  >
                    Gỡ bỏ
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Nhập mã voucher..."
                  className="flex-1 uppercase text-xs px-3 py-2 border border-border-subtle rounded-lg focus:border-primary focus:outline-none font-semibold"
                />
                <button
                  type="button"
                  disabled={validatingPromo || !promoCode.trim()}
                  onClick={() => void applyVoucherByCode(promoCode)}
                  className="px-4 py-2 bg-slate-900 hover:bg-primary disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {validatingPromo ? '...' : 'Áp dụng'}
                </button>
              </div>

              {promoMessage && (
                <p
                  className={`mt-2 text-xs font-semibold ${
                    promoMessage.type === 'success' ? 'text-emerald-600' : 'text-badge-discount'
                  }`}
                >
                  {promoMessage.text}
                </p>
              )}

              {renderVoucherWallet()}
            </div>

            {/* Order Summary Card */}
            <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="font-bold text-base text-text-primary pb-3 border-b border-border-subtle flex items-center justify-between">
                <span>Đơn hàng của bạn ({selectedItems.length})</span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-primary font-bold hover:underline cursor-pointer"
                >
                  Sửa giỏ hàng
                </button>
              </h4>

              {/* Items preview */}
              <div className="divide-y divide-border-subtle max-h-72 overflow-y-auto pr-1">
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-text-primary truncate">{item.product.name}</div>
                      <div className="text-[11px] text-text-secondary">
                        {[item.variant?.storage, item.variant?.color].filter(Boolean).join(' • ')} • SL: x{item.quantity}
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
                {discountAmount > 0 && appliedVoucherCode && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Voucher ({appliedVoucherCode}):</span>
                    <span className="font-bold">-{formatVndPrice(discountAmount)}</span>
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
                  disabled={submittingOrder || redirectingVnpay}
                  className="w-full py-4 bg-badge-discount hover:bg-red-600 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submittingOrder || redirectingVnpay ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">
                        progress_activity
                      </span>
                      <span>
                        {redirectingVnpay
                          ? 'Đang chuyển hướng sang cổng VNPay...'
                          : 'Đang xử lý đơn hàng...'}
                      </span>
                    </>
                  ) : paymentMethod === 'vnpay' ? (
                    <>
                      <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                      <span>Đặt hàng &amp; Thanh toán qua VNPay</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                      <span>Xác nhận đặt hàng (COD)</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={submittingOrder || redirectingVnpay}
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
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ${
              vnpayRedirectError
                ? 'bg-amber-100 text-amber-600 ring-amber-50'
                : 'bg-emerald-100 text-emerald-600 ring-emerald-50'
            }`}
          >
            <span className="material-symbols-outlined text-[44px]">
              {vnpayRedirectError ? 'payments' : 'verified'}
            </span>
          </div>

          <h2 className="text-2xl font-extrabold text-text-primary">
            {vnpayRedirectError
              ? 'Đơn hàng đã tạo - Chờ thanh toán VNPay'
              : 'Đặt hàng thành công!'}
          </h2>
          <p className="text-xs text-text-secondary mt-1.5 max-w-md mx-auto">
            Cảm ơn bạn đã mua sắm tại <strong>TecoStore</strong>. Đơn hàng của bạn đã được ghi nhận và giữ tồn kho trên hệ thống.
          </p>

          {vnpayRedirectError && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                <span>Chưa thể chuyển sang cổng VNPay: {vnpayRedirectError}</span>
              </div>
              <p className="text-[11px] text-amber-700">
                Đơn hàng đã được lưu vào tài khoản của bạn. Bạn có thể bấm nút bên dưới để mở lại cổng thanh toán VNPay trong thời hạn 15 phút.
              </p>
              <button
                type="button"
                disabled={redirectingVnpay}
                onClick={() => void handleRetryVnpayPayment(placedOrder._id)}
                className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-all"
              >
                {redirectingVnpay ? 'Đang kết nối VNPay...' : 'Mở lại cổng thanh toán VNPay'}
              </button>
            </div>
          )}

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
              <span className="font-bold text-text-primary">
                {placedOrder.shippingAddress?.hoTenNguoiNhan ||
                  placedOrder.customerInfo?.fullName}{' '}
                ({placedOrder.shippingAddress?.soDienThoai || placedOrder.customerInfo?.phone})
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-text-secondary font-medium flex-shrink-0">Địa chỉ giao:</span>
              <span className="font-medium text-text-primary text-right pl-4">
                {placedOrder.shippingAddress
                  ? `${placedOrder.shippingAddress.diaChiChiTiet}, ${placedOrder.shippingAddress.phuongXa}, ${placedOrder.shippingAddress.quanHuyen}, ${placedOrder.shippingAddress.tinhThanh}`
                  : placedOrder.customerInfo?.shippingAddress}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary font-medium">Phương thức:</span>
              <span className="font-bold text-text-primary uppercase">
                {placedOrder.paymentMethod === 'cod'
                  ? 'Thanh toán tiền mặt (COD)'
                  : 'Thanh toán trực tuyến VNPay'}
              </span>
            </div>
            {placedOrder.discountAmount > 0 && (
              <div className="flex justify-between items-center text-emerald-600">
                <span className="font-medium">
                  Giảm giá Voucher {placedOrder.voucherCode ? `(${placedOrder.voucherCode})` : ''}:
                </span>
                <span className="font-bold">-{formatVndPrice(placedOrder.discountAmount)}</span>
              </div>
            )}
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
