import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Order, StaffOrderStatus } from '../../types/api';
import { confirmDialog, formatVndPrice, ordersApi } from '../../services/api';

const NEXT_STATUS_MAP: Record<
  string,
  { next: StaffOrderStatus; label: string; btnClass: string; icon: string }
> = {
  cho_xac_nhan: {
    next: 'da_xac_nhan',
    label: 'Duyệt đơn',
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    icon: 'task_alt',
  },
  da_xac_nhan: {
    next: 'dang_giao',
    label: 'Giao vận chuyển',
    btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    icon: 'local_shipping',
  },
  dang_giao: {
    next: 'da_giao',
    label: 'Xác nhận đã giao',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    icon: 'verified',
  },
};

export const AdminOrdersSection: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ordersApi.getAllOrdersManage();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách đơn hàng hệ thống');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const kpis = useMemo(() => {
    let validRevenue = 0;
    let pendingCount = 0;
    let shippingCount = 0;
    let deliveredCount = 0;

    for (const o of orders) {
      if (o.orderStatus !== 'da_huy' && o.orderStatus !== 'cancelled') {
        validRevenue += o.totalAmount || 0;
      }
      if (o.orderStatus === 'cho_xac_nhan' || o.orderStatus === 'pending') pendingCount++;
      if (o.orderStatus === 'dang_giao' || o.orderStatus === 'shipping') shippingCount++;
      if (o.orderStatus === 'da_giao' || o.orderStatus === 'delivered') deliveredCount++;
    }

    return { validRevenue, pendingCount, shippingCount, deliveredCount };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.orderStatus !== statusFilter) return false;
      if (!q) return true;
      const codeMatch = o.orderCode?.toLowerCase().includes(q);
      const nameMatch = (
        o.shippingAddress?.hoTenNguoiNhan ||
        o.customerInfo?.fullName ||
        ''
      )
        .toLowerCase()
        .includes(q);
      const phoneMatch = (
        o.shippingAddress?.soDienThoai ||
        o.customerInfo?.phone ||
        ''
      )
        .toLowerCase()
        .includes(q);
      return codeMatch || nameMatch || phoneMatch;
    });
  }, [orders, statusFilter, searchTerm]);

  const handleAdvanceStatus = async (ord: Order, nextStatus: StaffOrderStatus) => {
    const statusLabels: Record<StaffOrderStatus, string> = {
      da_xac_nhan: 'ĐÃ XÁC NHẬN',
      dang_giao: 'ĐANG VẬN CHUYỂN',
      da_giao: 'GIAO THÀNH CÔNG',
    };
    if (
      !(await confirmDialog(
        `Chuyển trạng thái đơn hàng ${ord.orderCode} sang "${statusLabels[nextStatus]}"?`,
        'Xác nhận cập nhật trạng thái đơn hàng',
      ))
    ) {
      return;
    }

    setUpdatingId(ord._id);
    try {
      const res = await ordersApi.updateOrderStatus(ord._id, nextStatus);
      setOrders((prev) => prev.map((item) => (item._id === ord._id ? res.order : item)));
      if (selectedOrder?._id === ord._id) {
        setSelectedOrder(res.order);
      }
      alert(`Đã cập nhật trạng thái đơn hàng ${ord.orderCode} sang "${statusLabels[nextStatus]}"!`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleInspectOrder = async (ord: Order) => {
    setSelectedOrder(ord);
    try {
      const fresh = await ordersApi.getManagedOrderDetail(ord._id);
      setSelectedOrder(fresh);
    } catch {
      // Keep list snapshot
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'cho_xac_nhan':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Chờ xác nhận
          </span>
        );
      case 'da_xac_nhan':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Đã xác nhận
          </span>
        );
      case 'dang_giao':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Đang giao hàng
          </span>
        );
      case 'da_giao':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã giao thành công
          </span>
        );
      case 'da_huy':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-text-secondary font-semibold">
            <span>Tổng giá trị đơn hợp lệ</span>
            <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
          </div>
          <div className="text-xl font-black text-badge-discount mt-2">
            {formatVndPrice(kpis.validRevenue)}
          </div>
          <p className="text-[11px] text-text-secondary mt-1">
            Trên tổng số {orders.length} đơn gần nhất
          </p>
        </div>

        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-text-secondary font-semibold">
            <span>Đơn chờ xác nhận</span>
            <span className="material-symbols-outlined text-amber-500 text-[20px]">
              pending_actions
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{kpis.pendingCount}</div>
          <p className="text-[11px] text-text-secondary mt-1">Cần nhân viên kiểm tra &amp; duyệt</p>
        </div>

        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-text-secondary font-semibold">
            <span>Đang vận chuyển</span>
            <span className="material-symbols-outlined text-indigo-600 text-[20px]">
              local_shipping
            </span>
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-2">{kpis.shippingCount}</div>
          <p className="text-[11px] text-text-secondary mt-1">Đang trên đường giao tới khách</p>
        </div>

        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-text-secondary font-semibold">
            <span>Giao thành công</span>
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">
              verified
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{kpis.deliveredCount}</div>
          <p className="text-[11px] text-text-secondary mt-1">Khách đã nhận hàng &amp; hoàn tất</p>
        </div>
      </div>

      {/* Main Orders Panel */}
      <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
          <div>
            <h3 className="text-base font-extrabold text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">
                receipt_long
              </span>
              Điều phối &amp; Xử lý Đơn hàng ({filteredOrders.length})
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Quy trình chuẩn: Chờ xác nhận ➔ Đã xác nhận ➔ Đang giao ➔ Đã giao
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadOrders()}
            className="px-3.5 py-2 rounded-xl border border-border-subtle hover:border-primary text-xs font-bold text-primary flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Làm mới dữ liệu
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
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
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full font-bold border whitespace-nowrap cursor-pointer transition-all ${
                  statusFilter === tab.key
                    ? 'bg-primary text-white border-primary'
                    : 'bg-slate-50 text-text-secondary border-border-subtle hover:border-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <span className="material-symbols-outlined text-[18px] text-text-secondary absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm mã đơn, tên khách, SĐT..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-border-subtle text-xs focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-badge-discount text-xs font-semibold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-text-secondary">
            <span className="material-symbols-outlined text-[28px] animate-spin text-primary">
              progress_activity
            </span>
            <p className="mt-2 font-medium">Đang tải danh sách đơn hàng toàn hệ thống...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-secondary">
            Không tìm thấy đơn hàng nào khớp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-text-secondary bg-slate-50/80">
                  <th className="py-3 px-3 font-bold">Mã đơn / Thời gian</th>
                  <th className="py-3 px-3 font-bold">Khách hàng nhận</th>
                  <th className="py-3 px-3 font-bold">Thanh toán</th>
                  <th className="py-3 px-3 font-bold">Tổng tiền</th>
                  <th className="py-3 px-3 font-bold">Trạng thái</th>
                  <th className="py-3 px-3 font-bold text-right">Thao tác vận hành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredOrders.map((ord) => {
                  const nextAction = NEXT_STATUS_MAP[ord.orderStatus];
                  const isUnpaidVnpay =
                    ord.paymentMethod === 'vnpay' && ord.paymentStatus !== 'paid';
                  const receiver =
                    ord.shippingAddress?.hoTenNguoiNhan ||
                    ord.customerInfo?.fullName ||
                    'Khách hàng';
                  const phone =
                    ord.shippingAddress?.soDienThoai || ord.customerInfo?.phone || '';

                  return (
                    <tr key={ord._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-mono font-bold text-primary">{ord.orderCode}</div>
                        <div className="text-[11px] text-text-secondary mt-0.5">
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleString('vi-VN') : '—'}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-text-primary">{receiver}</div>
                        <div className="text-[11px] text-text-secondary">{phone}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="uppercase font-bold text-[11px] block text-text-primary">
                          {ord.paymentMethod}
                        </span>
                        <span
                          className={`text-[10px] font-bold ${
                            ord.paymentStatus === 'paid'
                              ? 'text-emerald-600'
                              : ord.paymentStatus === 'failed'
                              ? 'text-badge-discount'
                              : 'text-amber-600'
                          }`}
                        >
                          {ord.paymentStatus === 'paid'
                            ? '✓ Đã thanh toán'
                            : ord.paymentStatus === 'failed'
                            ? '✕ Lỗi thanh toán'
                            : '• Chờ thanh toán'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-extrabold text-badge-discount text-sm">
                          {formatVndPrice(ord.totalAmount)}
                        </span>
                        <span className="block text-[10px] text-text-secondary">
                          {ord.items?.length || 0} mặt hàng
                        </span>
                      </td>
                      <td className="py-3.5 px-3">{renderStatusBadge(ord.orderStatus)}</td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void handleInspectOrder(ord)}
                            className="px-2.5 py-1.5 rounded-lg border border-border-subtle bg-white hover:border-primary hover:text-primary font-bold cursor-pointer"
                          >
                            Chi tiết
                          </button>

                          {nextAction && (
                            <button
                              type="button"
                              disabled={updatingId === ord._id || isUnpaidVnpay}
                              title={
                                isUnpaidVnpay
                                  ? 'Đơn VNPay phải ở trạng thái Đã thanh toán (paid) mới được duyệt chuyển tiếp'
                                  : ''
                              }
                              onClick={() => void handleAdvanceStatus(ord, nextAction.next)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${nextAction.btnClass}`}
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                {nextAction.icon}
                              </span>
                              <span>
                                {updatingId === ord._id ? 'Đang lưu...' : nextAction.label}
                              </span>
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
        )}
      </div>

      {/* Managed Order Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white border border-border-subtle rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border-subtle">
              <div>
                <h4 className="text-base font-extrabold text-text-primary">
                  Hồ sơ đơn hàng #{selectedOrder.orderCode}
                </h4>
                <p className="text-text-secondary mt-0.5">
                  Order ID: <span className="font-mono">{selectedOrder._id}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-border-subtle space-y-1">
                <span className="font-bold text-text-secondary uppercase text-[10px]">
                  Người nhận &amp; Địa chỉ giao
                </span>
                <p className="font-extrabold text-sm text-text-primary">
                  {selectedOrder.shippingAddress?.hoTenNguoiNhan} (
                  {selectedOrder.shippingAddress?.soDienThoai})
                </p>
                <p className="text-text-secondary">
                  {selectedOrder.shippingAddress
                    ? `${selectedOrder.shippingAddress.diaChiChiTiet}, ${selectedOrder.shippingAddress.phuongXa}, ${selectedOrder.shippingAddress.quanHuyen}, ${selectedOrder.shippingAddress.tinhThanh}`
                    : selectedOrder.customerInfo?.shippingAddress}
                </p>
                {selectedOrder.note && (
                  <p className="text-amber-700 font-semibold pt-1">
                    Ghi chú: {selectedOrder.note}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-border-subtle space-y-2">
                <span className="font-bold text-text-secondary uppercase text-[10px] block">
                  Thông tin đối soát
                </span>
                <div className="flex justify-between">
                  <span>Phương thức:</span>
                  <strong className="uppercase">{selectedOrder.paymentMethod}</strong>
                </div>
                <div className="flex justify-between">
                  <span>TT Thanh toán:</span>
                  <strong className="uppercase">{selectedOrder.paymentStatus}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Trạng thái vận đơn:</span>
                  {renderStatusBadge(selectedOrder.orderStatus)}
                </div>
              </div>
            </div>

            <div className="border border-border-subtle rounded-2xl p-4 space-y-2">
              <h5 className="font-bold text-text-primary pb-2 border-b border-border-subtle">
                Chi tiết sản phẩm ({selectedOrder.items.length})
              </h5>
              {selectedOrder.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center py-1.5">
                  <div>
                    <span className="font-bold text-text-primary block">
                      {it.productName || it.name}
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      {it.variantName} • SKU: {it.sku} • SL: x{it.quantity}
                    </span>
                  </div>
                  <span className="font-extrabold text-badge-discount">
                    {formatVndPrice(it.subtotal ?? (it.unitPrice ?? 0) * it.quantity)}
                  </span>
                </div>
              ))}
              <div className="pt-2.5 border-t border-border-subtle space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Tạm tính:</span>
                  <span className="font-semibold">{formatVndPrice(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Voucher ({selectedOrder.voucherCode}):</span>
                    <span className="font-bold">
                      -{formatVndPrice(selectedOrder.discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-1">
                  <span>Tổng cộng:</span>
                  <span className="text-badge-discount">
                    {formatVndPrice(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {NEXT_STATUS_MAP[selectedOrder.orderStatus] && (
                <button
                  type="button"
                  disabled={
                    updatingId === selectedOrder._id ||
                    (selectedOrder.paymentMethod === 'vnpay' &&
                      selectedOrder.paymentStatus !== 'paid')
                  }
                  onClick={() =>
                    void handleAdvanceStatus(
                      selectedOrder,
                      NEXT_STATUS_MAP[selectedOrder.orderStatus].next,
                    )
                  }
                  className={`px-4 py-2 rounded-xl font-bold cursor-pointer disabled:opacity-40 ${
                    NEXT_STATUS_MAP[selectedOrder.orderStatus].btnClass
                  }`}
                >
                  {NEXT_STATUS_MAP[selectedOrder.orderStatus].label}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold cursor-pointer"
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
