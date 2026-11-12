import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, formatVndPrice, ordersApi } from '../services/api';
import { Order, User } from '../types/api';

interface AccountPageProps {
  currentUser: User | null;
  onLogoutSuccess: () => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  currentUser,
  onLogoutSuccess,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');
  const [loading, setLoading] = useState(false);

  // Orders list state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [cancellingCode, setCancellingCode] = useState<string | null>(null);

  // If not logged in, redirect to login
  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const loadOrders = async () => {
    setLoadingOrders(true);
    setOrdersError(null);
    try {
      const res = await ordersApi.getUserOrders(1, 20);
      setOrders(res.data || []);
    } catch (err: unknown) {
      setOrdersError(err instanceof Error ? err.message : 'Không thể tải lịch sử đơn hàng');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab]);

  const handleCancelOrder = async (orderCode: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy đơn hàng ${orderCode}?`)) return;

    setCancellingCode(orderCode);
    try {
      await ordersApi.cancelOrder(orderCode);
      alert(`Đã hủy đơn hàng ${orderCode} thành công. Tồn kho sản phẩm đã được hoàn trả.`);
      loadOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Hủy đơn hàng thất bại');
    } finally {
      setCancellingCode(null);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await authApi.logout();
      onLogoutSuccess();
      navigate('/login');
    } catch {
      onLogoutSuccess();
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            Chờ xử lý
          </span>
        );
      case 'processing':
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            Đang đóng gói
          </span>
        );
      case 'shipping':
        return (
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            Đang vận chuyển
          </span>
        );
      case 'delivered':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            Giao thành công
          </span>
        );
      case 'cancelled':
        return (
          <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-[1240px] w-full mx-auto px-4 md:px-margin-desktop py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-xs text-text-secondary mb-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="hover:text-primary flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">home</span>
          Trang chủ
        </button>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-text-primary font-semibold">Tài khoản &amp; Đơn hàng</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Avatar & Tab Nav Menu */}
        <div className="md:col-span-4 bg-white border border-border-subtle rounded-2xl p-6 text-center shadow-xs flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-blue-50 border-2 border-primary/20 text-primary flex items-center justify-center font-black text-2xl shadow-inner mb-4">
            <span className="material-symbols-outlined text-[44px]">account_circle</span>
          </div>
          <h2 className="text-base font-extrabold text-text-primary">
            {currentUser.fullName || currentUser.fullname || 'Thành viên TecoStore'}
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">{currentUser.email}</p>
          <span className="inline-block mt-2 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-primary uppercase border border-blue-200">
            {currentUser.role === 'admin' ? 'Quản trị viên' : 'Khách hàng thân thiết'}
          </span>

          {/* Navigation Tabs */}
          <div className="w-full mt-6 space-y-2 text-xs font-bold text-left">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`w-full py-2.5 px-3.5 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-primary hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
              <span>Thông tin tài khoản</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`w-full py-2.5 px-3.5 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-primary hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              <span>Lịch sử đơn hàng của tôi</span>
            </button>
          </div>

          <div className="w-full mt-6 pt-6 border-t border-border-subtle flex flex-col gap-2">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="w-full py-2.5 rounded-xl border border-badge-discount text-badge-discount hover:bg-red-50 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>{loading ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Tab Content */}
        <div className="md:col-span-8 bg-white border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xs">
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-border-subtle pb-3">
                <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
                Thông tin cá nhân
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-border-subtle">
                  <span className="text-text-secondary block font-medium mb-1">Họ và tên:</span>
                  <span className="text-text-primary font-bold text-sm">
                    {currentUser.fullName || currentUser.fullname || 'Chưa cập nhật'}
                  </span>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-border-subtle">
                  <span className="text-text-secondary block font-medium mb-1">Email đăng ký:</span>
                  <span className="text-text-primary font-bold text-sm">{currentUser.email}</span>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-border-subtle">
                  <span className="text-text-secondary block font-medium mb-1">Số điện thoại:</span>
                  <span className="text-text-primary font-bold text-sm">
                    {currentUser.phone || 'Chưa cập nhật'}
                  </span>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-border-subtle">
                  <span className="text-text-secondary block font-medium mb-1">Trạng thái tài khoản:</span>
                  <span className="text-emerald-600 font-bold text-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Đang hoạt động (Active)
                  </span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-xl border border-blue-200/60 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="font-bold text-text-primary text-xs">Theo dõi đơn mua &amp; Bảo hành VIP</h4>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Kiểm tra trạng thái vận chuyển và thông tin chi tiết từng đơn hàng
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="px-4 py-2 bg-primary hover:bg-surface-tint text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-xs"
                >
                  Xem đơn hàng ngay
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ORDER HISTORY */}
          {activeTab === 'orders' && (
            <div>
              <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-5">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
                  Lịch sử đơn hàng của bạn
                </h3>
                <button
                  type="button"
                  onClick={loadOrders}
                  className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">refresh</span>
                  Làm mới
                </button>
              </div>

              {loadingOrders ? (
                <div className="py-12 text-center text-xs text-text-secondary">
                  <span className="material-symbols-outlined text-[28px] animate-spin text-primary">
                    progress_activity
                  </span>
                  <p className="mt-2 font-medium">Đang tải danh sách đơn hàng từ máy chủ...</p>
                </div>
              ) : ordersError ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-badge-discount text-xs">
                  {ordersError}
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center">
                  <span className="material-symbols-outlined text-[48px] text-slate-300">
                    inbox
                  </span>
                  <p className="font-bold text-sm text-text-primary mt-2">
                    Bạn chưa có đơn hàng nào
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Hãy dạo quanh cửa hàng và chọn cho mình sản phẩm ưng ý nhé!
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="mt-4 px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-surface-tint transition-all cursor-pointer"
                  >
                    Khám phá sản phẩm
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((ord) => (
                    <div
                      key={ord._id}
                      className="border border-border-subtle rounded-2xl p-4 sm:p-5 hover:border-primary/40 transition-all bg-slate-50/40 space-y-3"
                    >
                      {/* Order Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-subtle text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-primary text-sm">
                            {ord.orderCode}
                          </span>
                          <span className="text-text-secondary">•</span>
                          <span className="text-text-secondary">
                            {ord.createdAt ? new Date(ord.createdAt).toLocaleString('vi-VN') : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(ord.orderStatus)}
                          <span className="text-[11px] font-semibold text-slate-500 uppercase">
                            {ord.paymentMethod === 'cod' ? 'COD' : 'Chuyển khoản'}
                          </span>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="space-y-2">
                        {ord.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs gap-3">
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-text-primary block truncate">
                                {item.name}
                              </span>
                              <span className="text-[11px] text-text-secondary">
                                {item.storage} • {item.color} • Số lượng: x{item.quantity}
                              </span>
                            </div>
                            <span className="font-extrabold text-badge-discount flex-shrink-0">
                              {formatVndPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Order Footer */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border-subtle text-xs">
                        <div>
                          <span className="text-text-secondary">Giao tới: </span>
                          <span className="font-medium text-text-primary">
                            {ord.customerInfo.fullName} - {ord.customerInfo.shippingAddress} ({ord.customerInfo.phone})
                          </span>
                        </div>
                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <div className="text-right">
                            <span className="text-[11px] text-text-secondary block">Tổng thanh toán:</span>
                            <span className="text-base font-black text-badge-discount">
                              {formatVndPrice(ord.totalAmount)}
                            </span>
                          </div>
                          {ord.orderStatus === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(ord.orderCode)}
                              disabled={cancellingCode === ord.orderCode}
                              className="px-3 py-1.5 rounded-lg border border-badge-discount text-badge-discount hover:bg-red-50 text-xs font-bold transition-all cursor-pointer"
                            >
                              {cancellingCode === ord.orderCode ? 'Đang hủy...' : 'Hủy đơn'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
