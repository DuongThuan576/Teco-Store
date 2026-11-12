import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { User } from '../types/api';

interface RegisterPageProps {
  currentUser: User | null;
  onRegisterSuccess: (user: User) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  currentUser,
}) => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    if (password.length < 6) {
      setError('Mật khẩu phải chứa ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp với mật khẩu đã nhập.');
      return;
    }

    setLoading(true);

    try {
      await authApi.register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
      });

      // Redirect to login page with success notification
      navigate('/login', {
        state: { message: 'Đăng ký tài khoản thành công! Vui lòng đăng nhập.' },
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Đăng ký không thành công. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/60">
      <div className="max-w-md w-full bg-white rounded-2xl border border-border-subtle shadow-lg p-8 sm:p-10 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xl shadow-md mb-3">
            T
          </div>
          <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Tạo tài khoản mới
          </h2>
          <p className="mt-1.5 text-xs text-text-secondary">
            Gia nhập cộng đồng công nghệ <strong>TecoStore</strong> với nhiều đặc quyền
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-badge-discount text-xs flex items-center gap-2.5 animate-fadeIn">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Register Form */}
        <form className="space-y-3.5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="material-symbols-outlined text-[18px] text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2">
                person
              </span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-border-subtle text-xs text-text-primary bg-surface-page focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">
              Địa chỉ Email <span className="text-red-500">*</span>
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
            <label className="block text-xs font-bold text-text-primary mb-1">
              Số điện thoại
            </label>
            <div className="relative">
              <span className="material-symbols-outlined text-[18px] text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2">
                phone_iphone
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912345678 (tùy chọn)"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-border-subtle text-xs text-text-primary bg-surface-page focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">
              Mật khẩu <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="material-symbols-outlined text-[18px] text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
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

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">
              Xác nhận mật khẩu <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="material-symbols-outlined text-[18px] text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2">
                lock_clock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-border-subtle text-xs text-text-primary bg-surface-page focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary hover:bg-surface-tint text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-70 mt-3"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
                <span>Đang tạo tài khoản...</span>
              </>
            ) : (
              <span>Đăng ký tài khoản</span>
            )}
          </button>
        </form>

        {/* Footer Link to Login */}
        <div className="pt-4 border-t border-border-subtle/80 text-center">
          <p className="text-xs text-text-secondary">
            Bạn đã có tài khoản?{' '}
            <Link
              to="/login"
              className="text-primary font-bold hover:underline ml-1"
            >
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

