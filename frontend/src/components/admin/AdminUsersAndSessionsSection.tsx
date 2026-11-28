import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminUserItem,
  AuthSessionItem,
  AuthSessionStatus,
  PaginationMeta,
  User,
} from '../../types/api';
import { authApi, confirmDialog, usersApi } from '../../services/api';

// ================= 1. QUẢN LÝ NGƯỜI DÙNG (/admin/users) =================
interface AdminUsersSectionProps {
  currentUser: User;
  onViewUserSessions?: (userId: string) => void;
}

export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({
  currentUser,
  onViewUserSessions,
}) => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters on current page
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Action states
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // User detail modal state
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  const currentAdminId = String(currentUser.id || currentUser._id || '');

  const loadUsers = useCallback(
    async (targetPage = page, targetLimit = limit, silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await usersApi.getAllUsers(targetPage, targetLimit);
        setUsers(Array.isArray(res.data) ? res.data : []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Không thể tải danh sách người dùng',
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, limit],
  );

  useEffect(() => {
    void loadUsers(page, limit);
  }, [page, limit, loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q) ||
        (u.id || '').toLowerCase().includes(q)
      );
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const handleOpenDetail = async (userId: string) => {
    setLoadingDetail(true);
    try {
      const detail = await usersApi.getUserDetail(userId);
      setSelectedUser(detail);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể tải chi tiết tài khoản',
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleToggleStatus = async (target: AdminUserItem) => {
    const nextStatus: 'active' | 'inactive' =
      target.status === 'active' ? 'inactive' : 'active';
    const actionLabel = nextStatus === 'inactive' ? 'KHÓA' : 'MỞ KHÓA';

    if (
      !(await confirmDialog(
        `Bạn có chắc muốn ${actionLabel} tài khoản "${target.fullName}" (${target.email})?\nLưu ý: Mọi phiên đăng nhập đang hoạt động của tài khoản này sẽ bị thu hồi.`,
        `Xác nhận ${actionLabel.toLowerCase()} tài khoản`,
      ))
    ) {
      return;
    }

    setBusyUserId(target.id);
    setFeedback(null);
    try {
      const res = await usersApi.updateUserStatus(target.id, nextStatus);
      const msg = res.message || 'Cập nhật trạng thái tài khoản thành công';
      setFeedback({
        type: 'success',
        text: msg,
      });
      alert(msg);
      if (selectedUser && selectedUser.id === target.id && res.user) {
        setSelectedUser(res.user);
      }
      await loadUsers(page, limit, true);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error ? err.message : 'Cập nhật trạng thái tài khoản thất bại',
      });
    } finally {
      setBusyUserId(null);
    }
  };

  const handleChangeRole = async (
    target: AdminUserItem,
    nextRole: 'customer' | 'employee',
  ) => {
    if (target.role === nextRole) return;
    const roleLabel =
      nextRole === 'employee' ? 'Nhân viên (employee)' : 'Khách hàng (customer)';

    if (
      !(await confirmDialog(
        `Chuyển vai trò của "${target.fullName}" (${target.email}) sang ${roleLabel}?\nLưu ý: Mọi phiên đăng nhập hiện tại của người dùng này sẽ bị thu hồi để áp dụng quyền mới.`,
        'Xác nhận phân quyền tài khoản',
      ))
    ) {
      return;
    }

    setBusyUserId(target.id);
    setFeedback(null);
    try {
      const res = await usersApi.updateUserRole(target.id, nextRole);
      const msg = res.message || 'Thay đổi vai trò tài khoản thành công';
      setFeedback({
        type: 'success',
        text: msg,
      });
      alert(msg);
      if (selectedUser && selectedUser.id === target.id && res.user) {
        setSelectedUser(res.user);
      }
      await loadUsers(page, limit, true);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Thay đổi vai trò thất bại',
      });
    } finally {
      setBusyUserId(null);
    }
  };

  const renderRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-50 text-purple-700 border border-purple-200">
          Admin
        </span>
      );
    }
    if (role === 'employee' || role === 'staff') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
          Employee
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
        Customer
      </span>
    );
  };

  const renderStatusBadge = (status: string) => {
    const isActive = status === 'active';
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
          isActive
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-600 border border-red-200'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isActive ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        />
        {isActive ? 'Đang hoạt động' : 'Đã khóa'}
      </span>
    );
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-[26px]">
              group
            </span>
            Quản lý người dùng ({pagination.total})
          </h1>
          <p className="text-slate-500 mt-1">
            Xem danh sách tài khoản, kiểm tra thông tin chi tiết, phân quyền Nhân viên / Khách hàng và khóa hoặc mở khóa tài khoản.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => {
              setPage(1);
              setLimit(Number(e.target.value));
            }}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
          </select>

          <button
            type="button"
            onClick={() => void loadUsers(page, limit)}
            disabled={loading}
            className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-500 text-blue-600 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-3.5 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-blue-50/70 to-white text-blue-900 shadow-xs flex items-center justify-between gap-3 font-semibold">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[16px]">
                {feedback.type === 'success' ? 'check_circle' : 'info'}
              </span>
            </span>
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="w-6 h-6 rounded-lg text-blue-400 hover:text-blue-700 hover:bg-blue-100/60 flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 font-semibold">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo họ tên, email, số điện thoại hoặc User ID..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="employee">Nhân viên (Employee)</option>
            <option value="customer">Khách hàng (Customer)</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động (Active)</option>
            <option value="inactive">Đã khóa (Inactive)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-400">
                <th className="py-3.5 px-4">Tài khoản</th>
                <th className="py-3.5 px-4">Số điện thoại</th>
                <th className="py-3.5 px-4">Vai trò</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4">Ngày tham gia</th>
                <th className="py-3.5 px-4 text-right">Thao tác quản trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không tìm thấy người dùng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u.id === currentAdminId;
                  const isTargetAdmin = u.role === 'admin';
                  const isBusy = busyUserId === u.id;
                  const canModify = !isSelf && !isTargetAdmin;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 font-extrabold flex items-center justify-center flex-shrink-0">
                            {(u.fullName || u.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 truncate">
                                {u.fullName || 'Chưa đặt tên'}
                              </span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[9px]">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {u.email}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ID: {u.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {u.phone || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {renderRoleBadge(u.role)}
                          {canModify && (
                            <select
                              value={u.role === 'employee' ? 'employee' : 'customer'}
                              disabled={isBusy}
                              onChange={(e) =>
                                void handleChangeRole(
                                  u,
                                  e.target.value as 'customer' | 'employee',
                                )
                              }
                              className="h-7 px-2 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
                              title="Đổi vai trò tài khoản"
                            >
                              <option value="customer">Customer</option>
                              <option value="employee">Employee</option>
                            </select>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">{renderStatusBadge(u.status)}</td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleString('vi-VN')
                          : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => void handleOpenDetail(u.id)}
                            disabled={loadingDetail}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:border-blue-500 hover:text-blue-600 font-bold cursor-pointer"
                          >
                            Chi tiết
                          </button>

                          {onViewUserSessions && (
                            <button
                              type="button"
                              onClick={() => onViewUserSessions(u.id)}
                              className="px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100 font-bold cursor-pointer"
                              title="Xem các phiên đăng nhập của người dùng này"
                            >
                              Sessions
                            </button>
                          )}

                          {canModify ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleToggleStatus(u)}
                              className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer disabled:opacity-50 ${
                                u.status === 'active'
                                  ? 'border-red-200 bg-white text-red-600 hover:bg-red-50'
                                  : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {isBusy
                                ? 'Đang xử lý...'
                                : u.status === 'active'
                                  ? 'Khóa'
                                  : 'Mở khóa'}
                            </button>
                          ) : (
                            <span className="px-2 py-1 text-[10px] text-slate-400 italic">
                              Bảo vệ
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">
            Trang <strong>{pagination.page}</strong> /{' '}
            <strong>{Math.max(1, pagination.totalPages)}</strong> • Tổng{' '}
            <strong>{pagination.total}</strong> tài khoản
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-40 cursor-pointer"
            >
              ← Trang trước
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-40 cursor-pointer"
            >
              Trang sau →
            </button>
          </div>
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center">
                  {(selectedUser.fullName || selectedUser.email || 'U')
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {selectedUser.fullName}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-700 text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">
                  User ID
                </span>
                <span className="font-mono font-bold text-slate-800 break-all">
                  {selectedUser.id}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">
                  Số điện thoại
                </span>
                <span className="font-bold text-slate-800">
                  {selectedUser.phone || 'Chưa cập nhật'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">
                  Vai trò hiện tại
                </span>
                {renderRoleBadge(selectedUser.role)}
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">
                  Trạng thái
                </span>
                {renderStatusBadge(selectedUser.status)}
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">
                  Ngày tạo tài khoản
                </span>
                <span className="text-slate-700 font-medium">
                  {selectedUser.createdAt
                    ? new Date(selectedUser.createdAt).toLocaleString('vi-VN')
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">
                  Cập nhật gần nhất
                </span>
                <span className="text-slate-700 font-medium">
                  {selectedUser.updatedAt
                    ? new Date(selectedUser.updatedAt).toLocaleString('vi-VN')
                    : '—'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {onViewUserSessions && (
                <button
                  type="button"
                  onClick={() => {
                    const targetId = selectedUser.id;
                    setSelectedUser(null);
                    onViewUserSessions(targetId);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">devices</span>
                  <span>Xem phiên đăng nhập của User này</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer ml-auto"
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

// ================= 2. QUẢN LÝ PHIÊN ĐĂNG NHẬP (/admin/sessions) =================
interface AdminSessionsSectionProps {
  currentUser: User;
  initialUserId?: string;
  onClearInitialUserId?: () => void;
}

export const AdminSessionsSection: React.FC<AdminSessionsSectionProps> = ({
  currentUser,
  initialUserId,
  onClearInitialUserId,
}) => {
  const [sessions, setSessions] = useState<AuthSessionItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [userIdInput, setUserIdInput] = useState<string>(initialUserId || '');
  const [appliedUserId, setAppliedUserId] = useState<string>(initialUserId || '');
  const [statusFilter, setStatusFilter] = useState<'all' | AuthSessionStatus>('all');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Directory of users to display user names/emails next to userId
  const [userMap, setUserMap] = useState<Record<string, AdminUserItem>>({});

  const currentAdminId = String(currentUser.id || currentUser._id || '');

  useEffect(() => {
    if (initialUserId !== undefined && initialUserId !== appliedUserId) {
      setUserIdInput(initialUserId);
      setAppliedUserId(initialUserId);
      setPage(1);
    }
  }, [initialUserId, appliedUserId]);

  useEffect(() => {
    usersApi
      .getAllUsers(1, 50)
      .then((res) => {
        const map: Record<string, AdminUserItem> = {};
        for (const u of res.data || []) {
          map[u.id] = u;
        }
        setUserMap(map);
      })
      .catch(() => {});
  }, []);

  const loadSessions = useCallback(
    async (
      targetPage = page,
      targetLimit = limit,
      targetUserId = appliedUserId,
      silent = false,
    ) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await authApi.getSessions(
          targetPage,
          targetLimit,
          targetUserId || undefined,
        );
        setSessions(Array.isArray(res.data) ? res.data : []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách phiên đăng nhập',
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, limit, appliedUserId],
  );

  useEffect(() => {
    void loadSessions(page, limit, appliedUserId);
  }, [page, limit, appliedUserId, loadSessions]);

  const filteredSessions = useMemo(() => {
    if (statusFilter === 'all') return sessions;
    return sessions.filter((s) => s.status === statusFilter);
  }, [sessions, statusFilter]);

  const handleApplyUserFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedUserId(userIdInput.trim());
  };

  const handleClearUserFilter = () => {
    setUserIdInput('');
    setAppliedUserId('');
    setPage(1);
    onClearInitialUserId?.();
  };

  const handleRevokeSession = async (session: AuthSessionItem) => {
    if (
      !(await confirmDialog(
        `Thu hồi phiên đăng nhập #${session.id.slice(-8).toUpperCase()} của User ${session.userId}?`,
        'Xác nhận thu hồi phiên đăng nhập',
      ))
    ) {
      return;
    }

    setRevokingId(session.id);
    setFeedback(null);
    try {
      const res = await authApi.revokeSession(session.id);
      const msg = res.message || 'Đã thu hồi phiên đăng nhập thành công';
      setFeedback({
        type: 'success',
        text: msg,
      });
      alert(msg);
      await loadSessions(page, limit, appliedUserId, true);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Thu hồi phiên đăng nhập thất bại',
      });
    } finally {
      setRevokingId(null);
    }
  };

  const renderSessionStatusBadge = (status: AuthSessionStatus) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Đang hoạt động
        </span>
      );
    }
    if (status === 'revoked') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Đã thu hồi
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Đã hết hạn
      </span>
    );
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-[26px]">
              devices
            </span>
            Quản lý phiên đăng nhập ({pagination.total})
          </h1>
          <p className="text-slate-500 mt-1">
            Giám sát toàn bộ Refresh Token Sessions trong hệ thống, lọc theo người dùng và thu hồi phiên đăng nhập từ xa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => {
              setPage(1);
              setLimit(Number(e.target.value));
            }}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
            <option value={100}>100 / trang</option>
          </select>

          <button
            type="button"
            onClick={() => void loadSessions(page, limit, appliedUserId)}
            disabled={loading}
            className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-500 text-blue-600 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-3.5 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-blue-50/70 to-white text-blue-900 shadow-xs flex items-center justify-between gap-3 font-semibold">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[16px]">
                {feedback.type === 'success' ? 'check_circle' : 'info'}
              </span>
            </span>
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="w-6 h-6 rounded-lg text-blue-400 hover:text-blue-700 hover:bg-blue-100/60 flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 font-semibold">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <form
          onSubmit={handleApplyUserFilter}
          className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
        >
          <div className="sm:col-span-5 relative">
            <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
              person_search
            </span>
            <input
              type="text"
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              placeholder="Nhập User ID (24 ký tự hex) để lọc phiên..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={appliedUserId}
              onChange={(e) => {
                const val = e.target.value;
                setUserIdInput(val);
                setAppliedUserId(val);
                setPage(1);
                if (!val) onClearInitialUserId?.();
              }}
              className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
            >
              <option value="">-- Chọn nhanh người dùng --</option>
              {Object.values(userMap).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
            >
              Lọc User
            </button>
            {appliedUserId && (
              <button
                type="button"
                onClick={handleClearUserFilter}
                className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Bỏ lọc
              </button>
            )}
          </div>
        </form>

        {/* Status Quick Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { key: 'all', label: 'Tất cả trên trang' },
                { key: 'active', label: 'Đang hoạt động' },
                { key: 'revoked', label: 'Đã thu hồi' },
                { key: 'expired', label: 'Đã hết hạn' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                  statusFilter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {appliedUserId && (
            <div className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg font-semibold">
              Đang lọc theo User:{' '}
              <strong>
                {userMap[appliedUserId]
                  ? `${userMap[appliedUserId].fullName} (${userMap[appliedUserId].email})`
                  : appliedUserId}
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-400">
                <th className="py-3.5 px-4">Session ID</th>
                <th className="py-3.5 px-4">Người dùng</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4">Thời điểm tạo / Cập nhật</th>
                <th className="py-3.5 px-4">Hết hạn / Thu hồi</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Đang tải danh sách phiên đăng nhập...
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không có phiên đăng nhập nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => {
                  const matchedUser = userMap[s.userId];
                  const isOwnSession = s.userId === currentAdminId;
                  const canRevoke = s.status === 'active' && !isOwnSession;
                  const isRevoking = revokingId === s.id;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        <span className="font-bold text-slate-900">
                          #{s.id.slice(-8).toUpperCase()}
                        </span>
                        <span className="block text-[10px] text-slate-400">{s.id}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        {matchedUser ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">
                                {matchedUser.fullName}
                              </span>
                              {isOwnSession && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[9px]">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 block">
                              {matchedUser.email}
                            </span>
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setUserIdInput(s.userId);
                            setAppliedUserId(s.userId);
                            setPage(1);
                          }}
                          className="font-mono text-[10px] text-blue-600 hover:underline cursor-pointer"
                          title="Bấm để lọc riêng người dùng này"
                        >
                          UID: {s.userId}
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        {renderSessionStatusBadge(s.status)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div>
                          <span className="text-slate-400">Tạo: </span>
                          <span className="font-medium">
                            {new Date(s.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        {s.updatedAt && (
                          <div className="text-[11px] text-slate-400">
                            CN: {new Date(s.updatedAt).toLocaleString('vi-VN')}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div>
                          <span className="text-slate-400">Hết hạn: </span>
                          <span className="font-medium">
                            {new Date(s.expiresAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        {s.revokedAt && (
                          <div className="text-[11px] text-red-600 font-semibold">
                            Thu hồi: {new Date(s.revokedAt).toLocaleString('vi-VN')}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {canRevoke ? (
                          <button
                            type="button"
                            disabled={isRevoking}
                            onClick={() => void handleRevokeSession(s)}
                            className="px-3 py-1 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 font-bold cursor-pointer disabled:opacity-50"
                          >
                            {isRevoking ? 'Đang thu hồi...' : 'Thu hồi phiên'}
                          </button>
                        ) : isOwnSession && s.status === 'active' ? (
                          <span className="text-[10px] text-slate-400 italic">
                            Phiên của bạn
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">
            Trang <strong>{pagination.page}</strong> /{' '}
            <strong>{Math.max(1, pagination.totalPages)}</strong> • Tổng{' '}
            <strong>{pagination.total}</strong> phiên đăng nhập
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-40 cursor-pointer"
            >
              ← Trang trước
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-40 cursor-pointer"
            >
              Trang sau →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
