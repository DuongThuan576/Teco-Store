import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartItem } from '../types/api';

interface CheckoutPageProps {
  cartItems: CartItem[];
  onOrderSuccess: (orderInfo: OrderSummary) => void;
}

export interface OrderSummary {
  orderCode: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  deliveryMethod: 'delivery' | 'store';
  paymentMethod: string;
  totalAmount: number;
  items: CartItem[];
  createdAt: string;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  cartItems,
  onOrderSuccess,
}) => {
  const navigate = useNavigate();

  // Selected items from Cart (only items with selected !== false)
  const orderItems = cartItems.filter((i) => i.selected !== false);

  // Form State
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  // Delivery
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'store'>('delivery');
  const [province, setProvince] = useState('Hà Nội');
  const [district, setDistrict] = useState('Quận Cầu Giấy');
  const [ward, setWard] = useState('Phường Dịch Vọng Hậu');
  const [addressDetail, setAddressDetail] = useState('');
  const [storeLocation, setStoreLocation] = useState('128 Cầu Giấy, P. Dịch Vọng, Q. Cầu Giấy, Hà Nội');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderSummary | null>(null);

  const subtotal = orderItems.reduce((sum, item) => {
    const price = item.variant?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  const shippingFee = 0; // Miễn phí toàn quốc
  const totalAmount = subtotal + shippingFee;

  const formatPrice = (val: number) => `${val.toLocaleString('vi-VN')}₫`;

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      alert('Vui lòng nhập đầy đủ Họ tên và Số điện thoại nhận hàng.');
      return;
    }

    if (deliveryMethod === 'delivery' && !addressDetail.trim()) {
      alert('Vui lòng nhập địa chỉ nhận hàng chi tiết.');
      return;
    }

    setIsSubmitting(true);

    const orderCode = `TECO-${Math.floor(100000 + Math.random() * 900000)}`;
    const fullAddress =
      deliveryMethod === 'delivery'
        ? `${addressDetail}, ${ward}, ${district}, ${province}`
        : `Nhận tại: ${storeLocation}`;

    const summary: OrderSummary = {
      orderCode,
      customerName: `${gender === 'male' ? 'Anh' : 'Chị'} ${fullName}`,
      phone,
      email,
      address: fullAddress,
      deliveryMethod,
      paymentMethod,
      totalAmount,
      items: orderItems,
      createdAt: new Date().toLocaleString('vi-VN'),
    };

    setTimeout(() => {
      setIsSubmitting(false);
      setCompletedOrder(summary);
      onOrderSuccess(summary);
    }, 800);
  };

  // SUCCESS SCREEN (Step 3: Hoàn tất)
  if (completedOrder) {
    return (
      <div className="max-w-[800px] w-full mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-border-subtle p-8 sm:p-10 text-center shadow-sm">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/50">
            <span className="material-symbols-outlined text-[48px]">check_circle</span>
          </div>

          <h2 className="text-2xl font-black text-text-primary">ĐẶT HÀNG THÀNH CÔNG!</h2>
          <p className="text-xs text-text-secondary mt-1">
            Cảm ơn quý khách đã tin chọn TecoStore. Đơn hàng của bạn đang được xử lý.
          </p>

          <div className="bg-surface-page rounded-xl p-5 my-6 text-left border border-border-subtle space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2.5 border-b border-border-subtle/80 font-bold text-sm text-text-primary">
              <span>Mã đơn hàng:</span>
              <span className="font-mono text-primary font-black">{completedOrder.orderCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Người nhận:</span>
              <span className="font-semibold text-text-primary">{completedOrder.customerName} - {completedOrder.phone}</span>
            </div>
            {completedOrder.email && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Email nhận hóa đơn:</span>
                <span className="font-semibold text-text-primary">{completedOrder.email}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-text-secondary">Địa chỉ:</span>
              <span className="font-semibold text-text-primary max-w-sm text-right">{completedOrder.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Hình thức thanh toán:</span>
              <span className="font-semibold text-text-primary">
                {completedOrder.paymentMethod === 'cod'
                  ? 'Thanh toán khi nhận hàng (COD)'
                  : completedOrder.paymentMethod === 'qr'
                  ? 'Chuyển khoản QR (VietQR / VNPAY)'
                  : 'Thẻ tín dụng / Ghi nợ'}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-2.5 border-t border-border-subtle/80">
              <span className="font-bold text-sm text-text-primary">Tổng tiền thanh toán:</span>
              <span className="font-black text-lg text-badge-discount">
                {formatPrice(completedOrder.totalAmount)}
              </span>
            </div>
          </div>

          {/* List of ordered products */}
          <div className="border border-border-subtle rounded-xl p-4 text-left text-xs mb-6 space-y-2.5">
            <h4 className="font-bold text-text-primary mb-2">Sản phẩm trong đơn ({completedOrder.items.length})</h4>
            {completedOrder.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-slate-700 py-1 border-b border-slate-100 last:border-none">
                <div>
                  <span className="font-semibold">{item.product.name}</span>
                  <span className="text-text-secondary block text-[11px]">
                    {[item.variant?.storage, item.variant?.color].filter(Boolean).join(' - ')} × {item.quantity}
                  </span>
                </div>
                <span className="font-bold text-primary">
                  {formatPrice((item.variant?.price || 0) * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-primary text-white font-bold text-xs rounded-xl hover:bg-surface-tint active:scale-95 transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            Về lại Trang chủ TecoStore
          </button>
        </div>
      </div>
    );
  }

  // If cart is empty
  if (orderItems.length === 0) {
    return (
      <div className="max-w-[600px] mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="material-symbols-outlined text-3xl">shopping_cart</span>
        </div>
        <h3 className="text-lg font-bold text-text-primary">Chưa có sản phẩm để thanh toán</h3>
        <p className="text-xs text-text-secondary mt-1 mb-5">
          Vui lòng thêm sản phẩm vào giỏ hàng trước khi tiến hành thanh toán.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-surface-tint transition-all cursor-pointer"
        >
          Khám phá sản phẩm
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] w-full mx-auto px-4 md:px-margin-desktop py-6">
      {/* Stepper Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border-subtle mb-6">
        <nav className="flex items-center space-x-2 text-xs text-text-secondary">
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="hover:text-primary flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Giỏ hàng
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-text-primary font-semibold">Thông tin &amp; Thanh toán</span>
        </nav>

        {/* 3-Step Stepper */}
        <div className="flex items-center gap-2 sm:gap-4 self-center md:self-auto text-xs font-semibold">
          <div className="flex items-center gap-2 text-text-secondary opacity-60">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
              1
            </span>
            <span>1. Giỏ hàng</span>
          </div>
          <div className="w-8 sm:w-12 h-0.5 bg-border-subtle"></div>
          <div className="flex items-center gap-2 text-primary">
            <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs ring-4 ring-blue-100">
              2
            </span>
            <span>2. Thông tin &amp; Thanh toán</span>
          </div>
          <div className="w-8 sm:w-12 h-0.5 bg-border-subtle"></div>
          <div className="flex items-center gap-2 text-text-secondary opacity-60">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
              3
            </span>
            <span>3. Hoàn tất</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmitOrder}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT 7 COLS: CUSTOMER INFO, DELIVERY, PAYMENT */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Customer Information Card */}
            <div className="bg-white border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  person
                </span>
                1. Thông tin người đặt hàng
              </h3>

              <div className="flex items-center gap-5 text-xs font-medium">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    checked={gender === 'male'}
                    onChange={() => setGender('male')}
                    className="text-primary focus:ring-primary"
                  />
                  <span>Anh</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    checked={gender === 'female'}
                    onChange={() => setGender('female')}
                    className="text-primary focus:ring-primary"
                  />
                  <span>Chị</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                    Họ và tên <span className="text-badge-discount">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-border-subtle focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                    Số điện thoại <span className="text-badge-discount">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-border-subtle focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  Email (nhận hóa đơn điện tử VAT)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-border-subtle focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* 2. Delivery Method Card */}
            <div className="bg-white border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  local_shipping
                </span>
                2. Hình thức nhận hàng
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('delivery')}
                  className={`py-3 px-4 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    deliveryMethod === 'delivery'
                      ? 'border-primary bg-blue-50/70 text-primary shadow-2xs'
                      : 'border-border-subtle text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">home</span>
                  Giao tận nơi
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('store')}
                  className={`py-3 px-4 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    deliveryMethod === 'store'
                      ? 'border-primary bg-blue-50/70 text-primary shadow-2xs'
                      : 'border-border-subtle text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">storefront</span>
                  Nhận tại siêu thị
                </button>
              </div>

              {deliveryMethod === 'delivery' ? (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-text-secondary mb-1">
                        Tỉnh / Thành phố
                      </label>
                      <select
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="w-full text-xs px-2.5 py-2 rounded-lg border border-border-subtle bg-surface-page focus:outline-none focus:border-primary"
                      >
                        <option value="Hà Nội">Hà Nội</option>
                        <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                        <option value="Đà Nẵng">Đà Nẵng</option>
                        <option value="Cần Thơ">Cần Thơ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-text-secondary mb-1">
                        Quận / Huyện
                      </label>
                      <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full text-xs px-2.5 py-2 rounded-lg border border-border-subtle focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-text-secondary mb-1">
                        Phường / Xã
                      </label>
                      <input
                        type="text"
                        value={ward}
                        onChange={(e) => setWard(e.target.value)}
                        className="w-full text-xs px-2.5 py-2 rounded-lg border border-border-subtle focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                      Số nhà, tên đường cụ thể <span className="text-badge-discount">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                      placeholder="Ví dụ: Số 20, Ngõ 15 Duy Tân"
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-border-subtle focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="pt-2 text-xs space-y-2">
                  <label className="block text-[11px] font-semibold text-text-secondary">
                    Chọn địa chỉ siêu thị TecoStore gần bạn nhất:
                  </label>
                  <select
                    value={storeLocation}
                    onChange={(e) => setStoreLocation(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-border-subtle bg-surface-page focus:outline-none focus:border-primary font-medium"
                  >
                    <option value="128 Cầu Giấy, P. Dịch Vọng, Q. Cầu Giấy, Hà Nội">
                      128 Cầu Giấy, P. Dịch Vọng, Q. Cầu Giấy, Hà Nội
                    </option>
                    <option value="208 Nguyễn Trãi, P. Thanh Xuân Trung, Q. Thanh Xuân, Hà Nội">
                      208 Nguyễn Trãi, P. Thanh Xuân Trung, Q. Thanh Xuân, Hà Nội
                    </option>
                    <option value="350 Ba Tháng Hai, P. 12, Q. 10, TP. Hồ Chí Minh">
                      350 Ba Tháng Hai, P. 12, Q. 10, TP. Hồ Chí Minh
                    </option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-text-secondary mb-1">
                  Ghi chú đơn hàng (không bắt buộc)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao 15 phút..."
                  className="w-full text-xs px-3.5 py-2 rounded-lg border border-border-subtle focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* 3. Payment Method Card */}
            <div className="bg-white border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs space-y-3.5">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  payments
                </span>
                3. Phương thức thanh toán
              </h3>

              <div className="space-y-2.5 text-xs">
                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-border-subtle hover:border-primary cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-bold text-text-primary block">Thanh toán khi nhận hàng (COD)</span>
                    <span className="text-text-secondary text-[11px]">Thanh toán tiền mặt hoặc chuyển khoản khi nhận kiểm tra hàng</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-border-subtle hover:border-primary cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="qr"
                    checked={paymentMethod === 'qr'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-bold text-text-primary block">Chuyển khoản ngân hàng qua mã QR (VietQR / VNPAY)</span>
                    <span className="text-text-secondary text-[11px]">Quét mã QR tự động điền số tài khoản và nội dung chuyển khoản</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-border-subtle hover:border-primary cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-bold text-text-primary block">Thẻ tín dụng / Ghi nợ quốc tế</span>
                    <span className="text-text-secondary text-[11px]">Hỗ trợ Visa, MasterCard, JCB bảo mật qua cổng thanh toán</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: ORDER SUMMARY & CONFIRMATION */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs sticky top-20 space-y-4">
              <h3 className="text-base font-bold text-text-primary pb-3 border-b border-border-subtle">
                Tóm tắt đơn hàng ({orderItems.length} sản phẩm)
              </h3>

              {/* Items List */}
              <div className="space-y-3 max-h-72 overflow-y-auto no-scrollbar pr-1 divide-y divide-slate-100">
                {orderItems.map((item) => {
                  const itemPrice = item.variant?.price || 0;
                  const imgSrc =
                    item.variant?.images?.[0] ||
                    item.product.images?.[0] ||
                    'https://www.gstatic.com/labs-code/stitch/stitch-placeholder-300x300.svg';

                  return (
                    <div key={item.id} className="pt-2.5 first:pt-0 flex gap-3 items-center">
                      <div className="w-14 h-14 rounded-lg bg-surface-page border border-border-subtle p-1 flex-shrink-0 flex items-center justify-center">
                        <img
                          src={imgSrc}
                          alt={item.product.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-text-primary truncate">
                          {item.product.name}
                        </h4>
                        <div className="text-[11px] text-text-secondary mt-0.5">
                          {[item.variant?.storage, item.variant?.color].filter(Boolean).join(' - ')}
                        </div>
                        <div className="flex justify-between items-baseline mt-1 text-xs">
                          <span className="text-slate-500">Số lượng: <strong>{item.quantity}</strong></span>
                          <span className="font-bold text-primary">
                            {formatPrice(itemPrice * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Price Details */}
              <div className="pt-3 border-t border-border-subtle space-y-2 text-xs">
                <div className="flex justify-between text-text-secondary">
                  <span>Tạm tính:</span>
                  <span className="font-semibold text-text-primary">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Phí vận chuyển:</span>
                  <span className="font-semibold text-emerald-600">Miễn phí toàn quốc</span>
                </div>
                <div className="pt-2.5 border-t border-border-subtle flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-bold text-text-primary block">Tổng thanh toán:</span>
                    <span className="text-[10px] text-text-secondary">(Đã gồm thuế VAT)</span>
                  </div>
                  <span className="text-xl font-black text-badge-discount">
                    {formatPrice(totalAmount)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-badge-discount hover:bg-red-600 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <span>Đang tạo đơn hàng...</span>
                ) : (
                  <>
                    <span>XÁC NHẬN ĐẶT HÀNG</span>
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-text-secondary text-center leading-relaxed">
                Bằng việc bấm xác nhận, bạn đồng ý với Điều khoản mua hàng và Chính sách bảo mật của TecoStore.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

