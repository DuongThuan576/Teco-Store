import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  addressesApi,
  authApi,
  formatVndPrice,
  ordersApi,
  paymentsApi,
  setAccessToken,
  usersApi,
} from '../services/api';
import { Address, CreateAddressDTO, Order, Product, User } from '../types/api';

interface AccountPageProps {
  currentUser: User | null;
  products: Product[];
  onUserUpdated: (user: User) => void;
  onLogoutSuccess: (customMessage?: string) => void;
}

type AccountTab = 'profile' | 'addresses' | 'orders';

const EMPTY_ADDRESS_FORM: CreateAddressDTO = {
  receiverName: '',
  phone: '',
  province: 'TP. Hồ Chí Minh',
  district: '',
  ward: '',
  address: '',
};

export const AccountPage: React.FC<AccountPageProps> = ({
  currentUser,
  products,
  onUserUpdated,
  onLogoutSuccess,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const requestedTab = (location.state as { tab?: AccountTab } | null)?.tab;
  const [activeTab, setActiveTab] = useState<AccountTab>(
    requestedTab === 'orders' || requestedTab === 'addresses' ? requestedTab : 'profile',
  );
  const [loadingLogout, setLoadingLogout] = useState(false);

  // ================= TAB 1: PROFILE & CHANGE PASSWORD STATE =================
  const [profileFullName, setProfileFullName] = useState<string>(
    currentUser?.fullName || currentUser?.fullname || '',
  );
  const [profilePhone, setProfilePhone] = useState<string>(currentUser?.phone || '');
  const [createdAtDate, setCreatedAtDate] = useState<string | undefined>(currentUser?.createdAt);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [profileFeedback, setProfileFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPasswords, setShowPasswords] = useState<boolean>(false);
  const [changingPassword, setChangingPassword] = useState<boolean>(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // ================= TAB 2: ADDRESS BOOK STATE =================
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState<boolean>(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState<boolean>(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<CreateAddressDTO>(EMPTY_ADDRESS_FORM);
  const [savingAddress, setSavingAddress] = useState<boolean>(false);
  const [busyAddressId, setBusyAddressId] = useState<string | null>(null);

  // ================= TAB 3: ORDERS & DETAIL MODAL STATE =================
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  // Order Detail Modal
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [loadingDetailModal, setLoadingDetailModal] = useState<boolean>(false);

  // Fetch fresh profile on mount
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    let mounted = true;
    usersApi
      .getMe()
      .then((me) => {
        if (!mounted) return;
        setProfileFullName(me.fullName || '');
        setProfilePhone(me.phone || '');
        setCreatedAtDate(me.createdAt);
        onUserUpdated({ ...currentUser, ...me });
      })
      .catch(() => {
        // Fallback to currentUser in memory
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?._id]);

  const loadAddresses = useCallback(async () => {
    setLoadingAddresses(true);
    setAddressError(null);
    try {
      const list = await addressesApi.getMyAddresses();
      setAddresses(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      setAddressError(err instanceof Error ? err.message : 'Không thể tải danh sách địa chỉ');
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    setOrdersError(null);
    try {
      const list = await ordersApi.getUserOrders();
      setOrders(list);
    } catch (err: unknown) {
      setOrdersError(err instanceof Error ? err.message : 'Không thể tải lịch sử đơn hàng');
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (activeTab === 'addresses') {
      void loadAddresses();
    } else if (activeTab === 'orders') {
      void loadOrders();
    }
  }, [activeTab, currentUser, loadAddresses, loadOrders]);

  if (!currentUser) {
    return null;
  }

  // ================= PROFILE & PASSWORD HANDLERS =================
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);

    const trimmedName = profileFullName.trim();
    const cleanedPhone = profilePhone.replace(/[\s.-]/g, '');

    if (!trimmedName) {
      setProfileFeedback({ type: 'error', text: 'Họ và tên không được để trống.' });
      return;
    }

    if (cleanedPhone && !/^0[0-9]{9}$/.test(cleanedPhone)) {
      setProfileFeedback({
        type: 'error',
        text: 'Số điện thoại phải gồm 10 chữ số bắt đầu bằng số 0 (hoặc để trống).',
      });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await usersApi.updateProfile({
        fullName: trimmedName,
        phone: cleanedPhone,
      });
      setProfilePhone(cleanedPhone);
      onUserUpdated({ ...currentUser, ...res.user });
      setProfileFeedback({
        type: 'success',
        text: res.message || 'Cập nhật thông tin cá nhân thành công!',
      });
    } catch (err: unknown) {
      setProfileFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Cập nhật hồ sơ thất bại.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordFeedback({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 8 ký tự.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', text: 'Mật khẩu mới nhập lại không khớp.' });
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordFeedback({
        type: 'error',
        text: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
      });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await usersApi.changePassword({
        currentPassword,
        newPassword,
      });
      // Backend revokes all sessions & increments tokenVersion -> clear token & redirect to login
      setAccessToken(null);
      onLogoutSuccess(
        res.message || 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại bằng mật khẩu mới.',
      );
      navigate('/login', {
        state: {
          message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại bằng mật khẩu mới.',
        },
      });
    } catch (err: unknown) {
      setPasswordFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Đổi mật khẩu không thành công.',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // ================= ADDRESS BOOK HANDLERS =================
  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({
      ...EMPTY_ADDRESS_FORM,
      receiverName: currentUser.fullName || currentUser.fullname || '',
      phone: currentUser.phone || '',
    });
    setAddressError(null);
    setShowAddressForm(true);
  };

  const handleOpenEditAddress = (addr: Address) => {
    setEditingAddressId(addr._id);
    setAddressForm({
      receiverName: addr.receiverName,
      phone: addr.phone,
      province: addr.province,
      district: addr.district,
      ward: addr.ward,
      address: addr.address,
    });
    setAddressError(null);
    setShowAddressForm(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError(null);

    const cleanedPhone = addressForm.phone.replace(/[\s.-]/g, '');
    if (!/^0[0-9]{9}$/.test(cleanedPhone)) {
      setAddressError('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0 (VD: 0912345678).');
      return;
    }

    const payload: CreateAddressDTO = {
      receiverName: addressForm.receiverName.trim(),
      phone: cleanedPhone,
      province: addressForm.province.trim(),
      district: addressForm.district.trim(),
      ward: addressForm.ward.trim(),
      address: addressForm.address.trim(),
    };

    if (
      !payload.receiverName ||
      !payload.province ||
      !payload.district ||
      !payload.ward ||
      !payload.address
    ) {
      setAddressError('Vui lòng điền đầy đủ tất cả các trường địa chỉ.');
      return;
    }

    setSavingAddress(true);
    try {
      if (editingAddressId) {
        await addressesApi.updateAddress(editingAddressId, payload);
      } else {
        await addressesApi.createAddress(payload);
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
      await loadAddresses();
    } catch (err: unknown) {
      setAddressError(err instanceof Error ? err.message : 'Lưu địa chỉ thất bại.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    setBusyAddressId(id);
    setAddressError(null);
    try {
      await addressesApi.setDefaultAddress(id);
      await loadAddresses();
    } catch (err: unknown) {
      setAddressError(err instanceof Error ? err.message : 'Không thể đặt địa chỉ mặc định.');
    } finally {
      setBusyAddressId(null);
    }
  };

  const handleDeleteAddress = async (addr: Address) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa địa chỉ nhận hàng của "${addr.receiverName}"?`)) {
      return;
    }
    setBusyAddressId(addr._id);
    setAddressError(null);
    try {
      await addressesApi.removeAddress(addr._id);
      await loadAddresses();
    } catch (err: unknown) {
      setAddressError(err instanceof Error ? err.message : 'Không thể xóa địa chỉ này.');
    } finally {
      setBusyAddressId(null);
    }
  };

  // ================= ORDER HANDLERS =================
  const handleOpenOrderDetail = async (ord: Order) => {
    setDetailOrder(ord);
    setLoadingDetailModal(true);
    try {
      const fresh = await ordersApi.getOrderDetail(ord._id);
      setDetailOrder(fresh);
    } catch {
      // Keep list snapshot if detail fetch fails
    } finally {
      setLoadingDetailModal(false);
    }
  };

  const handleCancelOrder = async (order: Order) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy đơn hàng ${order.orderCode}?`)) return;

    setCancellingId(order._id);
    try {
      const res = await ordersApi.cancelOrder(order._id);
      if (detailOrder?._id === order._id) {
        setDetailOrder(res.order);
      }
      alert(
        `Đã hủy đơn hàng ${order.orderCode} thành công. Tồn kho & lượt voucher (nếu có) đã được hoàn trả.`,
      );
      void loadOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Hủy đơn hàng thất bại');
    } finally {
      setCancellingId(null);
    }
  };

  const handlePayVnpay = async (order: Order) => {
    setPayingOrderId(order._id);
    try {
      const res = await paymentsApi.createVnpayUrl(order._id);
      window.location.href = res.paymentUrl;
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể tạo liên kết thanh toán VNPay');
      setPayingOrderId(null);
    }
  };

  const handleLogout = async () => {
    setLoadingLogout(true);
    try {
      await authApi.logout();
      onLogoutSuccess();
      navigate('/login');
    } catch {
      onLogoutSuccess();
      navigate('/login');
    } finally {
      setLoadingLogout(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'cho_xac_nhan':
      case 'pending':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            Chờ xác nhận
          </span>
        );
      case 'da_xac_nhan':
      case 'processing':
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            Đã xác nhận
          </span>
        );
      case 'dang_giao':
      case 'shipping':
        return (
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            Đang vận chuyển
          </span>
        );
      case 'da_giao':
      case 'delivered':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            Giao thành công
          </span>
        );
      case 'da_huy':
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

  const getPaymentStatusBadge = (paymentMethod: string, paymentStatus: string) => {
    if (paymentStatus === 'paid') {
      return (
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
          Đã thanh toán
        </span>
      );
    }
    if (paymentStatus === 'failed') {
      return (
        <span className="bg-red-50 text-badge-discount border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold">
          Thanh toán lỗi
        </span>
      );
    }
    return (
      <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
        {paymentMethod === 'vnpay' ? 'VNPay • Chờ TT' : 'COD'}
      </span>
    );
  };

  const getTimelineStepIndex = (status: string): number => {
    switch (status) {
      case 'cho_xac_nhan':
      case 'pending':
        return 1;
      case 'da_xac_nhan':
      case 'processing':
        return 2;
      case 'dang_giao':
      case 'shipping':
        return 3;
      case 'da_giao':
      case 'delivered':
        return 4;
      case 'da_huy':
      case 'cancelled':
        return -1;
      default:
        return 1;
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter === 'all') return true;
    return o.orderStatus === orderStatusFilter;
  });

  const navigateToProductForReview = (productId: string, itemSlug?: string) => {
    const matched = products.find((p) => String(p._id) === String(productId));
    const slugToOpen = matched?.slug || itemSlug;
    if (slugToOpen) {
      setDetailOrder(null);
      navigate(`/product/${slugToOpen}`);
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
        <span className="text-text-primary font-semibold">Quản lý Tài khoản</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Avatar & 3-Tab Nav Menu */}
        <div className="md:col-span-4 lg:col-span-3 bg-white border border-border-subtle rounded-2xl p-6 text-center shadow-xs flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-blue-50 border-2 border-primary/20 text-primary flex items-center justify-center font-black text-2xl shadow-inner mb-3">
            {(currentUser.fullName || currentUser.fullname || currentUser.email || 'U')
              .charAt(0)
              .toUpperCase()}
          </div>
          <h2 className="text-base font-extrabold text-text-primary">
            {currentUser.fullName || currentUser.fullname || 'Thành viên TecoStore'}
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 break-all">{currentUser.email}</p>
          <span className="inline-block mt-2 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-primary uppercase border border-blue-200">
            {currentUser.role === 'admin'
              ? 'Quản trị viên'
              : currentUser.role === 'employee'
              ? 'Nhân viên vận hành'
              : 'Khách hàng thành viên'}
          </span>

          {createdAtDate && (
            <p className="text-[11px] text-text-secondary mt-2">
              Tham gia: {new Date(createdAtDate).toLocaleDateString('vi-VN')}
            </p>
          )}

          {/* Navigation Tabs */}
          <div className="w-full mt-6 space-y-2 text-xs font-bold text-left">
            {(currentUser.role === 'admin' ||
              currentUser.role === 'employee' ||
              currentUser.role === 'staff') && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="w-full py-2.5 px-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 flex items-center gap-2.5 transition-all cursor-pointer mb-2"
              >
                <span className="material-symbols-outlined text-[18px] text-amber-600">
                  admin_panel_settings
                </span>
                <span>Portal Quản trị &amp; Vận hành</span>
              </button>
            )}

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
              <span>Hồ sơ &amp; Đổi mật khẩu</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('addresses')}
              className={`w-full py-2.5 px-3.5 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'addresses'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-primary hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">location_on</span>
              <span>Sổ địa chỉ nhận hàng</span>
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
              <span>Lịch sử đơn hàng</span>
            </button>
          </div>

          <div className="w-full mt-6 pt-6 border-t border-border-subtle flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loadingLogout}
              className="w-full py-2.5 rounded-xl border border-badge-discount text-badge-discount hover:bg-red-50 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>{loadingLogout ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Tab Content */}
        <div className="md:col-span-8 lg:col-span-9 space-y-6">
          {/* ================= TAB 1: PROFILE & CHANGE PASSWORD ================= */}
          {activeTab === 'profile' && (
            <>
              {/* Profile Update Form Card */}
              <form
                onSubmit={handleUpdateProfile}
                className="bg-white border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xs space-y-5"
              >
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      badge
                    </span>
                    Cập nhật thông tin cá nhân
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Đang hoạt động
                  </span>
                </div>

                {profileFeedback && (
                  <div
                    className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      profileFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-badge-discount border border-red-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {profileFeedback.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    <span>{profileFeedback.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-text-primary mb-1.5">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={profileFullName}
                      onChange={(e) => setProfileFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full h-10 px-3.5 rounded-xl border border-border-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-text-primary mb-1.5">
                      Số điện thoại liên hệ (10 số)
                    </label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="0912345678"
                      className="w-full h-10 px-3.5 rounded-xl border border-border-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-text-secondary mb-1.5">
                      Email đăng nhập (Không thể thay đổi)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={currentUser.email}
                      className="w-full h-10 px-3.5 rounded-xl border border-border-subtle bg-slate-100 text-slate-500 cursor-not-allowed font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-2.5 bg-primary hover:bg-surface-tint disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[17px]">save</span>
                    <span>{savingProfile ? 'Đang lưu...' : 'Lưu thay đổi hồ sơ'}</span>
                  </button>
                </div>
              </form>

              {/* Change Password Card */}
              <form
                onSubmit={handleChangePassword}
                className="bg-white border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xs space-y-5"
              >
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      lock_reset
                    </span>
                    Đổi mật khẩu bảo mật
                  </h3>
                  <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showPasswords}
                      onChange={(e) => setShowPasswords(e.target.checked)}
                      className="rounded text-primary focus:ring-primary cursor-pointer"
                    />
                    <span>Hiện mật khẩu</span>
                  </label>
                </div>

                {passwordFeedback && (
                  <div
                    className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      passwordFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-badge-discount border border-red-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {passwordFeedback.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    <span>{passwordFeedback.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-text-primary mb-1.5">
                      Mật khẩu hiện tại <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Nhập mật khẩu cũ"
                      className="w-full h-10 px-3.5 rounded-xl border border-border-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-text-primary mb-1.5">
                      Mật khẩu mới (≥ 8 ký tự) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      required
                      minLength={8}
                      maxLength={72}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Ít nhất 8 ký tự"
                      className="w-full h-10 px-3.5 rounded-xl border border-border-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-text-primary mb-1.5">
                      Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      required
                      minLength={8}
                      maxLength={72}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full h-10 px-3.5 rounded-xl border border-border-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <p className="text-[11px] text-text-secondary">
                    * Vì lý do an toàn, sau khi đổi mật khẩu tất cả phiên đăng nhập cũ sẽ tự động thu hồi để bạn đăng nhập lại.
                  </p>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-primary disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex-shrink-0 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[17px]">key</span>
                    <span>{changingPassword ? 'Đang xử lý...' : 'Đổi mật khẩu'}</span>
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ================= TAB 2: ADDRESS BOOK ================= */}
          {activeTab === 'addresses' && (
            <div className="bg-white border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
                <div>
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      location_on
                    </span>
                    Sổ địa chỉ nhận hàng ({addresses.length})
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Quản lý các địa chỉ giao hàng để chọn nhanh khi thanh toán đơn hàng
                  </p>
                </div>

                {!showAddressForm && (
                  <button
                    type="button"
                    onClick={handleOpenAddAddress}
                    className="px-4 py-2.5 bg-primary hover:bg-surface-tint text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
                    <span>Thêm địa chỉ mới</span>
                  </button>
                )}
              </div>

              {addressError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-badge-discount text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{addressError}</span>
                </div>
              )}

              {/* Add / Edit Address Form */}
              {showAddressForm && (
                <form
                  onSubmit={handleSaveAddress}
                  className="p-5 rounded-2xl bg-blue-50/30 border border-primary/30 space-y-4 text-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                    <h4 className="font-extrabold text-sm text-text-primary">
                      {editingAddressId ? 'Chỉnh sửa địa chỉ giao hàng' : 'Thêm địa chỉ giao hàng mới'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddressForm(false);
                        setEditingAddressId(null);
                      }}
                      className="text-text-secondary hover:text-text-primary font-bold cursor-pointer"
                    >
                      ✕ Đóng
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-text-primary mb-1">
                        Họ và tên người nhận <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={addressForm.receiverName}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, receiverName: e.target.value })
                        }
                        placeholder="Nguyễn Văn A"
                        className="w-full h-10 px-3.5 rounded-xl border border-border-subtle bg-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-text-primary mb-1">
                        Số điện thoại (10 số) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                        placeholder="0912345678"
                        className="w-full h-10 px-3.5 rounded-xl border border-border-subtle bg-white focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-text-primary mb-1">
                        Tỉnh / Thành phố <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={addressForm.province}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, province: e.target.value })
                        }
                        placeholder="TP. Hồ Chí Minh / Hà Nội"
                        className="w-full h-10 px-3.5 rounded-xl border border-border-subtle bg-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-text-primary mb-1">
                        Quận / Huyện <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={addressForm.district}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, district: e.target.value })
                        }
                        placeholder="Quận 1"
                        className="w-full h-10 px-3.5 rounded-xl border border-border-subtle bg-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-text-primary mb-1">
                        Phường / Xã <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={addressForm.ward}
                        onChange={(e) => setAddressForm({ ...addressForm, ward: e.target.value })}
                        placeholder="Phường Bến Nghé"
                        className="w-full h-10 px-3.5 rounded-xl border border-border-subtle bg-white focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-text-primary mb-1">
                      Số nhà, tên đường cụ thể <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.address}
                      onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                      placeholder="Số 123 Đường Lê Lợi"
                      className="w-full h-10 px-3.5 rounded-xl border border-border-subtle bg-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddressForm(false);
                        setEditingAddressId(null);
                      }}
                      className="px-4 py-2 rounded-xl border border-border-subtle bg-white font-bold text-text-secondary hover:bg-slate-50 cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={savingAddress}
                      className="px-5 py-2 rounded-xl bg-primary hover:bg-surface-tint disabled:opacity-50 text-white font-bold cursor-pointer"
                    >
                      {savingAddress
                        ? 'Đang lưu...'
                        : editingAddressId
                        ? 'Cập nhật địa chỉ'
                        : 'Lưu địa chỉ'}
                    </button>
                  </div>
                </form>
              )}

              {/* Address List */}
              {loadingAddresses ? (
                <div className="py-12 text-center text-xs text-text-secondary">
                  <span className="material-symbols-outlined text-[28px] animate-spin text-primary">
                    progress_activity
                  </span>
                  <p className="mt-2 font-medium">Đang tải sổ địa chỉ...</p>
                </div>
              ) : addresses.length === 0 ? (
                <div className="py-12 text-center">
                  <span className="material-symbols-outlined text-[48px] text-slate-300">
                    home_pin
                  </span>
                  <p className="font-bold text-sm text-text-primary mt-2">
                    Bạn chưa lưu địa chỉ nhận hàng nào
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Thêm sẵn địa chỉ để đặt hàng nhanh hơn chỉ với 1 chạm!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => {
                    const isBusy = busyAddressId === addr._id;
                    return (
                      <div
                        key={addr._id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          addr.isDefault
                            ? 'border-primary/50 bg-blue-50/20'
                            : 'border-border-subtle bg-slate-50/40 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-text-primary">
                              {addr.receiverName}
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="font-semibold text-text-secondary">{addr.phone}</span>
                            {addr.isDefault && (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                Mặc định
                              </span>
                            )}
                          </div>
                          <p className="text-text-secondary leading-relaxed">
                            {addr.address}, {addr.ward}, {addr.district}, {addr.province}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0 text-xs">
                          {!addr.isDefault && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleSetDefaultAddress(addr._id)}
                              className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary hover:bg-blue-50 font-bold cursor-pointer transition-colors"
                            >
                              Đặt mặc định
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleOpenEditAddress(addr)}
                            className="px-3 py-1.5 rounded-lg border border-border-subtle bg-white hover:bg-slate-50 text-text-primary font-bold cursor-pointer"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleDeleteAddress(addr)}
                            className="px-3 py-1.5 rounded-lg border border-red-200 text-badge-discount hover:bg-red-50 font-bold cursor-pointer"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: ORDER HISTORY ================= */}
          {activeTab === 'orders' && (
            <div className="bg-white border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    receipt_long
                  </span>
                  Lịch sử đơn hàng của bạn ({orders.length})
                </h3>
                <button
                  type="button"
                  onClick={() => void loadOrders()}
                  className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">refresh</span>
                  Làm mới
                </button>
              </div>

              {/* Status Filter Pills */}
              {orders.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  {[
                    { key: 'all', label: 'Tất cả' },
                    { key: 'cho_xac_nhan', label: 'Chờ xác nhận' },
                    { key: 'da_xac_nhan', label: 'Đã xác nhận' },
                    { key: 'dang_giao', label: 'Đang giao' },
                    { key: 'da_giao', label: 'Đã giao' },
                    { key: 'da_huy', label: 'Đã hủy' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setOrderStatusFilter(tab.key)}
                      className={`px-3.5 py-1.5 rounded-full font-bold border whitespace-nowrap cursor-pointer transition-all ${
                        orderStatusFilter === tab.key
                          ? 'bg-primary text-white border-primary'
                          : 'bg-slate-50 text-text-secondary border-border-subtle hover:border-primary'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

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
              ) : filteredOrders.length === 0 ? (
                <div className="py-12 text-center">
                  <span className="material-symbols-outlined text-[48px] text-slate-300">
                    inbox
                  </span>
                  <p className="font-bold text-sm text-text-primary mt-2">
                    {orders.length === 0
                      ? 'Bạn chưa có đơn hàng nào'
                      : 'Không có đơn hàng nào ở trạng thái này'}
                  </p>
                  {orders.length === 0 && (
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="mt-4 px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-surface-tint transition-all cursor-pointer"
                    >
                      Khám phá sản phẩm
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((ord) => {
                    const receiverName =
                      ord.shippingAddress?.hoTenNguoiNhan ||
                      ord.customerInfo?.fullName ||
                      'Người nhận';
                    const receiverPhone =
                      ord.shippingAddress?.soDienThoai || ord.customerInfo?.phone || '';
                    const fullAddr = ord.shippingAddress
                      ? `${ord.shippingAddress.diaChiChiTiet}, ${ord.shippingAddress.phuongXa}, ${ord.shippingAddress.quanHuyen}, ${ord.shippingAddress.tinhThanh}`
                      : ord.customerInfo?.shippingAddress || '';

                    const canCancel =
                      (ord.orderStatus === 'cho_xac_nhan' || ord.orderStatus === 'pending') &&
                      ord.paymentMethod === 'cod' &&
                      ord.paymentStatus === 'pending';

                    const canPayVnpay =
                      ord.paymentMethod === 'vnpay' &&
                      ord.paymentStatus === 'pending' &&
                      ord.orderStatus === 'cho_xac_nhan';

                    return (
                      <div
                        key={ord._id}
                        className="border border-border-subtle rounded-2xl p-4 sm:p-5 hover:border-primary/40 transition-all bg-slate-50/40 space-y-3"
                      >
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-subtle text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-primary text-xs sm:text-sm">
                              {ord.orderCode}
                            </span>
                            {ord.createdAt && (
                              <>
                                <span className="text-text-secondary">•</span>
                                <span className="text-text-secondary">
                                  {new Date(ord.createdAt).toLocaleString('vi-VN')}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(ord.orderStatus)}
                            {getPaymentStatusBadge(ord.paymentMethod, ord.paymentStatus)}
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-2">
                          {ord.items.map((item, idx) => {
                            const itemName = item.productName || item.name || 'Sản phẩm';
                            const variantLabel =
                              item.variantName ||
                              [item.storage, item.color].filter(Boolean).join(' - ');
                            const unitPrice = item.unitPrice ?? item.price ?? 0;
                            const lineSubtotal = item.subtotal ?? unitPrice * item.quantity;

                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs gap-3"
                              >
                                <div className="flex-1 min-w-0">
                                  <span className="font-bold text-text-primary block truncate">
                                    {itemName}
                                  </span>
                                  <span className="text-[11px] text-text-secondary">
                                    {variantLabel ? `${variantLabel} • ` : ''}Số lượng: x
                                    {item.quantity}
                                  </span>
                                </div>
                                <span className="font-extrabold text-badge-discount flex-shrink-0">
                                  {formatVndPrice(lineSubtotal)}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Order Footer */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border-subtle text-xs">
                          <div className="min-w-0 flex-1">
                            <span className="text-text-secondary">Giao tới: </span>
                            <span className="font-medium text-text-primary">
                              {receiverName} ({receiverPhone}) — {fullAddr}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 self-end sm:self-auto flex-shrink-0 flex-wrap justify-end">
                            <div className="text-right mr-1">
                              <span className="text-[11px] text-text-secondary block">
                                Tổng thanh toán:
                              </span>
                              <span className="text-base font-black text-badge-discount">
                                {formatVndPrice(ord.totalAmount)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => void handleOpenOrderDetail(ord)}
                              className="px-3 py-1.5 rounded-lg border border-border-subtle bg-white hover:border-primary hover:text-primary text-text-primary text-xs font-bold transition-all cursor-pointer"
                            >
                              Chi tiết
                            </button>

                            {canPayVnpay && (
                              <button
                                type="button"
                                onClick={() => void handlePayVnpay(ord)}
                                disabled={payingOrderId === ord._id}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                              >
                                {payingOrderId === ord._id ? 'Đang mở...' : 'Thanh toán VNPay'}
                              </button>
                            )}

                            {canCancel && (
                              <button
                                type="button"
                                onClick={() => void handleCancelOrder(ord)}
                                disabled={cancellingId === ord._id}
                                className="px-3 py-1.5 rounded-lg border border-badge-discount text-badge-discount hover:bg-red-50 text-xs font-bold transition-all cursor-pointer"
                              >
                                {cancellingId === ord._id ? 'Đang hủy...' : 'Hủy đơn'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= ORDER DETAIL & TRACKING TIMELINE MODAL ================= */}
      {detailOrder && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setDetailOrder(null)}
        >
          <div
            className="bg-white border border-border-subtle rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-border-subtle">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-extrabold text-text-primary">
                    Chi tiết đơn hàng
                  </h3>
                  <span className="font-mono font-bold text-primary text-sm bg-blue-50 px-2.5 py-0.5 rounded-lg">
                    {detailOrder.orderCode}
                  </span>
                </div>
                {detailOrder.createdAt && (
                  <p className="text-xs text-text-secondary mt-1">
                    Đặt lúc: {new Date(detailOrder.createdAt).toLocaleString('vi-VN')}
                    {loadingDetailModal ? ' • Đang đồng bộ...' : ''}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 4-Step Order Tracking Timeline */}
            {(() => {
              const stepIdx = getTimelineStepIndex(detailOrder.orderStatus);
              if (stepIdx === -1) {
                return (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-badge-discount text-xs font-bold flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[22px]">cancel</span>
                    <span>
                      Đơn hàng này đã bị hủy. Tồn kho sản phẩm và lượt dùng Voucher (nếu có) đã được hoàn trả.
                    </span>
                  </div>
                );
              }

              const timelineSteps = [
                { idx: 1, label: 'Chờ xác nhận', icon: 'assignment' },
                { idx: 2, label: 'Đã xác nhận', icon: 'inventory' },
                { idx: 3, label: 'Đang vận chuyển', icon: 'local_shipping' },
                { idx: 4, label: 'Giao thành công', icon: 'verified' },
              ];

              return (
                <div className="bg-slate-50 border border-border-subtle rounded-2xl p-4">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {timelineSteps.map((st) => {
                      const done = stepIdx >= st.idx;
                      const current = stepIdx === st.idx;
                      return (
                        <div key={st.idx} className="flex flex-col items-center gap-1.5">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                              done
                                ? current
                                  ? 'bg-primary text-white ring-4 ring-blue-100'
                                  : 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-400'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {st.icon}
                            </span>
                          </div>
                          <span
                            className={`text-[11px] font-bold ${
                              done ? 'text-text-primary' : 'text-text-secondary'
                            }`}
                          >
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Shipping & Payment Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-border-subtle space-y-1.5">
                <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    local_shipping
                  </span>
                  Địa chỉ người nhận
                </h4>
                <p className="font-extrabold text-text-primary text-sm">
                  {detailOrder.shippingAddress?.hoTenNguoiNhan ||
                    detailOrder.customerInfo?.fullName}
                </p>
                <p className="font-semibold text-text-secondary">
                  SĐT:{' '}
                  {detailOrder.shippingAddress?.soDienThoai || detailOrder.customerInfo?.phone}
                </p>
                <p className="text-text-secondary leading-relaxed">
                  {detailOrder.shippingAddress
                    ? `${detailOrder.shippingAddress.diaChiChiTiet}, ${detailOrder.shippingAddress.phuongXa}, ${detailOrder.shippingAddress.quanHuyen}, ${detailOrder.shippingAddress.tinhThanh}`
                    : detailOrder.customerInfo?.shippingAddress}
                </p>
                {detailOrder.note && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 mt-1">
                    Ghi chú: {detailOrder.note}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-border-subtle space-y-2">
                <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    payments
                  </span>
                  Thanh toán &amp; Trạng thái
                </h4>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Phương thức:</span>
                  <span className="font-bold text-text-primary uppercase">
                    {detailOrder.paymentMethod === 'vnpay' ? 'Cổng VNPay' : 'Tiền mặt (COD)'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Thanh toán:</span>
                  {getPaymentStatusBadge(detailOrder.paymentMethod, detailOrder.paymentStatus)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Vận đơn:</span>
                  {getStatusBadge(detailOrder.orderStatus)}
                </div>
              </div>
            </div>

            {/* Ordered Items Table */}
            <div className="border border-border-subtle rounded-2xl p-4 space-y-3 text-xs">
              <h4 className="font-bold text-text-primary pb-2 border-b border-border-subtle">
                Danh sách sản phẩm ({detailOrder.items.length})
              </h4>
              <div className="divide-y divide-border-subtle">
                {detailOrder.items.map((item, idx) => {
                  const itemName = item.productName || item.name || 'Sản phẩm';
                  const variantLabel =
                    item.variantName || [item.storage, item.color].filter(Boolean).join(' - ');
                  const unitPrice = item.unitPrice ?? item.price ?? 0;
                  const lineTotal = item.subtotal ?? unitPrice * item.quantity;

                  return (
                    <div
                      key={idx}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-text-primary block">{itemName}</span>
                        <span className="text-[11px] text-text-secondary">
                          {variantLabel ? `${variantLabel} • ` : ''}SKU: {item.sku} •{' '}
                          {formatVndPrice(unitPrice)} × {item.quantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span className="font-extrabold text-badge-discount">
                          {formatVndPrice(lineTotal)}
                        </span>
                        {detailOrder.orderStatus === 'da_giao' && (
                          <button
                            type="button"
                            onClick={() =>
                              navigateToProductForReview(item.productId, item.slug)
                            }
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-[11px] cursor-pointer"
                          >
                            ★ Đánh giá
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Financial Breakdown */}
              <div className="pt-3 border-t border-border-subtle space-y-1.5">
                <div className="flex justify-between text-text-secondary">
                  <span>Tạm tính:</span>
                  <span className="font-semibold text-text-primary">
                    {formatVndPrice(detailOrder.subtotal)}
                  </span>
                </div>
                {detailOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>
                      Mã giảm giá {detailOrder.voucherCode ? `(${detailOrder.voucherCode})` : ''}:
                    </span>
                    <span className="font-bold">-{formatVndPrice(detailOrder.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-text-secondary">
                  <span>Phí vận chuyển:</span>
                  <span className="font-semibold text-emerald-600">Miễn phí</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-border-subtle">
                  <span className="font-bold text-sm text-text-primary">Tổng cộng:</span>
                  <span className="text-lg font-black text-badge-discount">
                    {formatVndPrice(detailOrder.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              {detailOrder.paymentMethod === 'vnpay' &&
                detailOrder.paymentStatus === 'pending' &&
                detailOrder.orderStatus === 'cho_xac_nhan' && (
                  <button
                    type="button"
                    disabled={payingOrderId === detailOrder._id}
                    onClick={() => void handlePayVnpay(detailOrder)}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                  >
                    {payingOrderId === detailOrder._id ? 'Đang mở VNPay...' : 'Thanh toán VNPay ngay'}
                  </button>
                )}
              <button
                type="button"
                onClick={() => setDetailOrder(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-text-primary font-bold text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
