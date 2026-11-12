import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../services/api';
import { User } from '../types/api';

interface LoginPageProps {
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  currentUser,
  onLoginSuccess,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect to home
  if (currentUser) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.login({
        email: email.trim(),
        password,
      });

      onLoginSuccess(res.user);

      // Redirect back to returnUrl or home
      const from = (location.state as { from?: string })?.from || '/';
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Đăng nhập không thành công. Vui lòng kiểm tra lại email và mật khẩu.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/60">
      <div className="max-w-md w-full bg-white rounded-2xl border border-border-subtle shadow-lg p-8 sm:p-10 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xl shadow-md mb-3">
            T
          </div>
          <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Đăng nhập tài khoản
          </h2>
          <p className="mt-1.5 text-xs text-text-secondary">
            Chào mừng bạn quay lại với hệ thống bán lẻ <strong>TecoStore</strong>
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-badge-discount text-xs flex items-center gap-2.5 animate-fadeIn">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">
              Địa chỉ Email
            </label>
            <div className="relative">
              <span className="material-symbols-outlined text-[18px] text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2">
                mail
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-border-subtle text-xs text-text-primary bg-surface-page focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-text-primary">
                Mật khẩu
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Vui lòng liên hệ bộ phận hỗ trợ kỹ thuật TecoStore để lấy lại mật khẩu.');
                }}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Quên mật khẩu?
              </a>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined text-[18px] text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu của bạn"
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-border-subtle text-xs text-text-primary bg-surface-page focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary hover:bg-surface-tint text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-70 mt-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
                <span>Đang xác thực...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>
        </form>

        {/* Footer Link to Register */}
        <div className="pt-4 border-t border-border-subtle/80 text-center">
          <p className="text-xs text-text-secondary">
            Bạn chưa có tài khoản tại TecoStore?{' '}
            <Link
              to="/register"
              className="text-primary font-bold hover:underline ml-1"
            >
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

