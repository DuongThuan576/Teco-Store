import React, { useCallback, useEffect, useState } from 'react';
import { CreateVoucherDTO, DiscountType, Voucher } from '../../types/api';
import { formatVndPrice, vouchersApi } from '../../services/api';

function toLocalDatetimeInput(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export const AdminVouchersSection: React.FC = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

  const [code, setCode] = useState<string>('');
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(1000000);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>('200000');
  const [usageLimit, setUsageLimit] = useState<number>(100);
  const [usageLimitPerUser, setUsageLimitPerUser] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadVouchers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const list = await vouchersApi.getAllVouchers();
      setVouchers(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách Voucher');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVouchers();
  }, [loadVouchers]);

  const openCreateModal = () => {
    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    setEditingVoucher(null);
    setCode('');
    setDiscountType('percentage');
    setDiscountValue(10);
    setMinOrderAmount(1000000);
    setMaxDiscountAmount('200000');
    setUsageLimit(100);
    setUsageLimitPerUser(1);
    setStartDate(toLocalDatetimeInput(now.toISOString()));
    setEndDate(toLocalDatetimeInput(nextMonth.toISOString()));
    setIsActive(true);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (v: Voucher) => {
    setEditingVoucher(v);
    setCode(v.code);
    setDiscountType(v.discountType);
    setDiscountValue(v.discountValue);
    setMinOrderAmount(v.minOrderAmount);
    setMaxDiscountAmount(v.maxDiscountAmount != null ? String(v.maxDiscountAmount) : '');
    setUsageLimit(v.usageLimit);
    setUsageLimitPerUser(v.usageLimitPerUser);
    setStartDate(toLocalDatetimeInput(v.startDate));
    setEndDate(toLocalDatetimeInput(v.endDate));
    setIsActive(Boolean(v.isActive));
    setFormError(null);
    setShowModal(true);
  };

  const handleToggleActive = async (v: Voucher) => {
    try {
      await vouchersApi.updateVoucher(v._id, { isActive: !v.isActive });
      await loadVouchers(true);
      alert(
        !v.isActive
          ? `Đã kích hoạt lại mã giảm giá "${v.code}"!`
          : `Đã tạm khóa mã giảm giá "${v.code}"!`,
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái Voucher');
    }
  };

  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    setSaving(true);
    try {
      if (editingVoucher) {
        const hasBeenUsed = editingVoucher.usedCount > 0;
        if (hasBeenUsed) {
          // Backend locks core fields once usedCount > 0; only usageLimit (>= current), endDate (>= current), and isActive can be updated
          await vouchersApi.updateVoucher(editingVoucher._id, {
            usageLimit: Number(usageLimit),
            endDate: new Date(endDate).toISOString(),
            isActive,
          });
        } else {
          await vouchersApi.updateVoucher(editingVoucher._id, {
            code: code.trim().toUpperCase(),
            discountType,
            discountValue: Number(discountValue),
            minOrderAmount: Number(minOrderAmount),
            ...(discountType === 'percentage' && maxDiscountAmount.trim()
              ? { maxDiscountAmount: Number(maxDiscountAmount) }
              : {}),
            usageLimit: Number(usageLimit),
            usageLimitPerUser: Number(usageLimitPerUser),
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
            isActive,
          });
        }
      } else {
        const dto: CreateVoucherDTO = {
          code: code.trim().toUpperCase(),
          discountType,
          discountValue: Number(discountValue),
          minOrderAmount: Number(minOrderAmount),
          ...(discountType === 'percentage' && maxDiscountAmount.trim()
            ? { maxDiscountAmount: Number(maxDiscountAmount) }
            : {}),
          usageLimit: Number(usageLimit),
          usageLimitPerUser: Number(usageLimitPerUser),
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          isActive,
        };
        await vouchersApi.createVoucher(dto);
      }

      setShowModal(false);
      await loadVouchers(true);
      alert(
        editingVoucher
          ? `Đã cập nhật mã giảm giá "${editingVoucher.code}" thành công!`
          : `Đã tạo mã giảm giá "${code.trim().toUpperCase()}" thành công!`,
      );
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Lưu mã giảm giá thất bại');
    } finally {
      setSaving(false);
    }
  };

  const isLockedUsedVoucher = Boolean(editingVoucher && editingVoucher.usedCount > 0);

  return (
    <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div>
          <h3 className="text-base font-extrabold text-text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">
              confirmation_number
            </span>
            Quản trị Chiến dịch Mã Giảm Giá / Voucher ({vouchers.length})
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Tạo mã giảm theo phần trăm (%) hoặc số tiền cố định, giới hạn tổng lượt &amp; lượt mỗi khách hàng
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-primary hover:bg-surface-tint text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Phát hành Voucher mới</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-badge-discount text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-text-secondary">
          <span className="material-symbols-outlined text-[28px] animate-spin text-primary">
            progress_activity
          </span>
          <p className="mt-2">Đang tải danh sách Voucher...</p>
        </div>
      ) : vouchers.length === 0 ? (
        <div className="py-12 text-center text-xs text-text-secondary">
          Chưa có mã giảm giá nào trong hệ thống.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vouchers.map((v) => {
            const now = new Date();
            const expired = new Date(v.endDate) <= now;
            const pctUsed =
              v.usageLimit > 0 ? Math.min(100, Math.round((v.usedCount / v.usageLimit) * 100)) : 0;

            return (
              <div
                key={v._id}
                className="border border-border-subtle rounded-2xl p-4 bg-slate-50/50 space-y-3 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm px-2.5 py-0.5 rounded-lg bg-primary text-white">
                        {v.code}
                      </span>
                      <span className="font-extrabold text-badge-discount text-sm">
                        {v.discountType === 'percentage'
                          ? `Giảm ${v.discountValue}%`
                          : `Giảm ${formatVndPrice(v.discountValue)}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-1">
                      Đơn tối thiểu: <strong>{formatVndPrice(v.minOrderAmount)}</strong>
                      {v.discountType === 'percentage' && v.maxDiscountAmount
                        ? ` • Tối đa: ${formatVndPrice(v.maxDiscountAmount)}`
                        : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleToggleActive(v)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer ${
                      v.isActive && !expired
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-200 text-slate-600 border-slate-300'
                    }`}
                  >
                    {expired ? 'Hết hạn' : v.isActive ? 'Đang kích hoạt' : 'Tạm tắt'}
                  </button>
                </div>

                {/* Usage Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-text-secondary">
                    <span>
                      Đã dùng: <strong>{v.usedCount}</strong>/{v.usageLimit} lượt (Tối đa{' '}
                      {v.usageLimitPerUser} lượt/khách)
                    </span>
                    <span>{pctUsed}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${pctUsed}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-[11px] text-text-secondary">
                  <span>
                    Hiệu lực: {new Date(v.startDate).toLocaleDateString('vi-VN')} ➔{' '}
                    {new Date(v.endDate).toLocaleDateString('vi-VN')}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditModal(v)}
                    className="px-3 py-1 rounded-lg border border-border-subtle bg-white hover:border-primary text-text-primary font-bold cursor-pointer"
                  >
                    Chỉnh sửa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Voucher Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <form
            onSubmit={handleSaveVoucher}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-border-subtle rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <h4 className="text-base font-extrabold text-text-primary">
                {editingVoucher ? `Cập nhật Voucher ${editingVoucher.code}` : 'Phát hành Voucher mới'}
              </h4>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isLockedUsedVoucher && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                Voucher này đã có <strong>{editingVoucher?.usedCount} lượt sử dụng</strong>. Theo quy tắc bảo toàn đối soát, bạn chỉ được phép <strong>tăng tổng lượt dùng</strong>, <strong>gia hạn ngày kết thúc</strong> hoặc <strong>bật/tắt kích hoạt</strong>.
              </div>
            )}

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-badge-discount font-semibold">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1">Mã Voucher (3-30 ký tự) *</label>
                <input
                  type="text"
                  required
                  disabled={isLockedUsedVoucher}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="VD: TECO500K"
                  className="w-full h-10 px-3 rounded-xl border border-border-subtle uppercase font-mono font-bold disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Loại giảm giá *</label>
                <select
                  disabled={isLockedUsedVoucher}
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                  className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-white disabled:bg-slate-100"
                >
                  <option value="percentage">Theo phần trăm (%)</option>
                  <option value="fixed">Số tiền cố định (₫)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">
                  {discountType === 'percentage' ? 'Phần trăm giảm (%) *' : 'Số tiền giảm (₫) *'}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={discountType === 'percentage' ? 100 : undefined}
                  disabled={isLockedUsedVoucher}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-border-subtle disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Đơn tối thiểu (₫) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  disabled={isLockedUsedVoucher}
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-border-subtle disabled:bg-slate-100"
                />
              </div>

              {discountType === 'percentage' && (
                <div>
                  <label className="block font-bold mb-1">Giảm tối đa (₫)</label>
                  <input
                    type="number"
                    min={1}
                    disabled={isLockedUsedVoucher}
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                    placeholder="VD: 200000"
                    className="w-full h-10 px-3 rounded-xl border border-border-subtle disabled:bg-slate-100"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1">Tổng lượt sử dụng toàn hệ thống *</label>
                <input
                  type="number"
                  required
                  min={editingVoucher ? Math.max(1, editingVoucher.usedCount) : 1}
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-border-subtle"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Giới hạn lượt / 1 Khách hàng *</label>
                <input
                  type="number"
                  required
                  min={1}
                  disabled={isLockedUsedVoucher}
                  value={usageLimitPerUser}
                  onChange={(e) => setUsageLimitPerUser(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-border-subtle disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1">Thời điểm bắt đầu *</label>
                <input
                  type="datetime-local"
                  required
                  disabled={isLockedUsedVoucher}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border-subtle disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Thời điểm kết thúc *</label>
                <input
                  type="datetime-local"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border-subtle"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-primary"
                />
                <span>Kích hoạt sử dụng ngay</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-surface-tint text-white font-bold cursor-pointer"
                >
                  {saving ? 'Đang lưu...' : editingVoucher ? 'Lưu cập nhật' : 'Phát hành'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
