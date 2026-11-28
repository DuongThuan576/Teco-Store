import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Order, VnpayReturnVerifyResponse } from '../types/api';
import { formatVndPrice, getAccessToken, ordersApi, paymentsApi } from '../services/api';

const VNPAY_RESPONSE_MESSAGES: Record<string, string> = {
  '00': 'Giao dịch thanh toán thành công.',
  '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
  '09': 'Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
  '10': 'Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.',
  '11': 'Đã hết hạn chờ thanh toán (quá 15 phút). Vui lòng thực hiện lại giao dịch.',
  '12': 'Thẻ/Tài khoản của khách hàng đang bị khóa.',
  '13': 'Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
  '24': 'Khách hàng đã hủy giao dịch thanh toán.',
  '51': 'Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
  '65': 'Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
  '75': 'Ngân hàng thanh toán đang bảo trì.',
  '79': 'Khách hàng nhập sai mật khẩu thanh toán quá số lần quy định.',
  '99': 'Lỗi không xác định từ cổng thanh toán.',
};

function formatVnpPayDate(raw?: string | null): string {
  if (!raw || !/^\d{14}$/.test(raw)) return raw || '—';
  const y = raw.slice(0, 4);
  const m = raw.slice(4, 6);
  const d = raw.slice(6, 8);
  const hh = raw.slice(8, 10);
  const mm = raw.slice(10, 12);
  const ss = raw.slice(12, 14);
  return `${hh}:${mm}:${ss} - ${d}/${m}/${y}`;
}

export const PaymentReturnPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState<boolean>(true);
  const [verifyResult, setVerifyResult] = useState<VnpayReturnVerifyResponse | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [retryingPayment, setRetryingPayment] = useState<boolean>(false);

  const queryInfo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const rawAmount = params.get('vnp_Amount');
    const amountVnd =
      rawAmount && /^\d+$/.test(rawAmount) ? Math.floor(Number(rawAmount) / 100) : undefined;

    return {
      hasVnpParams: Boolean(params.get('vnp_TxnRef') || params.get('vnp_SecureHash')),
      txnRef: params.get('vnp_TxnRef'),
      responseCode: params.get('vnp_ResponseCode'),
      transactionStatus: params.get('vnp_TransactionStatus'),
      transactionNo: params.get('vnp_TransactionNo'),
      bankCode: params.get('vnp_BankCode'),
      cardType: params.get('vnp_CardType'),
      payDate: params.get('vnp_PayDate'),
      orderInfo: params.get('vnp_OrderInfo'),
      amountVnd,
    };
  }, [location.search]);

  useEffect(() => {
    if (!queryInfo.hasVnpParams) {
      setVerifying(false);
      setVerifyError('Không tìm thấy tham số phản hồi từ cổng thanh toán VNPay.');
      return;
    }

    let isMounted = true;
    setVerifying(true);
    setVerifyError(null);

    paymentsApi
      .verifyVnpayReturn(location.search)
      .then(async (res) => {
        if (!isMounted) return;
        setVerifyResult(res);

        // Nếu người dùng đang đăng nhập và có orderId, tải chi tiết đơn hàng để hiển thị đầy đủ
        if (res.orderId && getAccessToken()) {
          try {
            const ord = await ordersApi.getOrderDetail(res.orderId);
            if (isMounted) setOrder(ord);
          } catch {
            // Không chặn hiển thị kết quả nếu không lấy được chi tiết đơn
          }
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setVerifyError(
          err instanceof Error
            ? err.message
            : 'Không thể xác thực kết quả giao dịch với máy chủ TecoStore.',
        );
      })
      .finally(() => {
        if (isMounted) setVerifying(false);
      });

    return () => {
      isMounted = false;
    };
  }, [location.search, queryInfo.hasVnpParams]);

  const handleRetryPayment = async () => {
    const targetOrderId = order?._id || verifyResult?.orderId;
    if (!targetOrderId) return;

    setRetryingPayment(true);
    try {
      const res = await paymentsApi.createVnpayUrl(targetOrderId);
      window.location.href = res.paymentUrl;
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : 'Không thể tạo lại liên kết thanh toán VNPay cho đơn hàng này.',
      );
      setRetryingPayment(false);
    }
  };

  const isSuccess = Boolean(verifyResult?.valid && verifyResult?.vnpayReportedSuccess);
  const isSignatureInvalid = verifyResult !== null && !verifyResult.valid;
  const responseReason =
    (queryInfo.responseCode && VNPAY_RESPONSE_MESSAGES[queryInfo.responseCode]) ||
    verifyResult?.message ||
    verifyError ||
    'Giao dịch chưa hoàn tất.';

  const canRetry =
    !isSuccess &&
    Boolean(verifyResult?.orderId) &&
    (!order || (order.paymentStatus === 'pending' && order.orderStatus === 'cho_xac_nhan'));

  return (
    <div className="max-w-[820px] w-full mx-auto px-4 py-10">
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
        <span className="text-text-primary font-semibold">Kết quả thanh toán VNPay</span>
      </nav>

      {verifying ? (
        <div className="bg-white border border-border-subtle rounded-3xl p-12 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-primary flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[36px] animate-spin">
              progress_activity
            </span>
          </div>
          <h2 className="text-lg font-extrabold text-text-primary">
            Đang đối soát chữ ký bảo mật VNPay...
          </h2>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            Hệ thống đang xác thực chữ ký số <strong>HMAC-SHA512</strong> và kiểm tra trạng thái giao dịch từ máy chủ TecoStore. Vui lòng không đóng trình duyệt.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-border-subtle rounded-3xl p-7 sm:p-10 shadow-md space-y-6">
          {/* Status Icon & Headline */}
          <div className="text-center">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ${
                isSuccess
                  ? 'bg-emerald-100 text-emerald-600 ring-emerald-50'
                  : 'bg-red-100 text-badge-discount ring-red-50'
              }`}
            >
              <span className="material-symbols-outlined text-[44px]">
                {isSuccess ? 'verified' : 'cancel'}
              </span>
            </div>

            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide mb-2 ${
                isSuccess
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-badge-discount border border-red-200'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {verifyResult?.valid ? 'lock' : 'gpp_bad'}
              </span>
              {verifyResult?.valid
                ? 'Chữ ký HMAC-SHA512 hợp lệ'
                : isSignatureInvalid
                ? 'Cảnh báo chữ ký không hợp lệ'
                : 'Kết quả phản hồi cổng thanh toán'}
            </span>

            <h1 className="text-2xl font-black text-text-primary mt-1">
              {isSuccess ? 'Thanh toán VNPay thành công!' : 'Giao dịch chưa hoàn tất'}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-1.5 max-w-lg mx-auto">
              {responseReason}
            </p>
          </div>

          {/* Transaction Receipt Details */}
          <div className="bg-slate-50 border border-border-subtle rounded-2xl p-5 text-xs space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-border-subtle">
              <span className="font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">
                  receipt_long
                </span>
                Chi tiết giao dịch VNPay
              </span>
              {queryInfo.bankCode && (
                <span className="px-2.5 py-0.5 rounded bg-blue-600 text-white font-extrabold text-[11px]">
                  {queryInfo.bankCode} {queryInfo.cardType ? `• ${queryInfo.cardType}` : ''}
                </span>
              )}
            </div>

            {order?.orderCode && (
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Mã đơn hàng TecoStore:</span>
                <span className="font-mono font-extrabold text-primary text-sm">
                  {order.orderCode}
                </span>
              </div>
            )}

            {(verifyResult?.transactionCode || queryInfo.txnRef) && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-text-secondary flex-shrink-0">Mã tham chiếu (TxnRef):</span>
                <span className="font-mono font-semibold text-text-primary truncate">
                  {verifyResult?.transactionCode || queryInfo.txnRef}
                </span>
              </div>
            )}

            {queryInfo.transactionNo && queryInfo.transactionNo !== '0' && (
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Mã giao dịch tại VNPay:</span>
                <span className="font-mono font-bold text-text-primary">
                  {queryInfo.transactionNo}
                </span>
              </div>
            )}

            {queryInfo.payDate && (
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Thời gian thanh toán:</span>
                <span className="font-semibold text-text-primary">
                  {formatVnpPayDate(queryInfo.payDate)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Trạng thái thanh toán đơn:</span>
              <span
                className={`font-bold ${
                  order?.paymentStatus === 'paid' || verifyResult?.paymentStatus === 'paid'
                    ? 'text-emerald-600'
                    : isSuccess
                    ? 'text-blue-600'
                    : 'text-badge-discount'
                }`}
              >
                {order?.paymentStatus === 'paid' || verifyResult?.paymentStatus === 'paid'
                  ? 'Đã xác nhận thanh toán (PAID)'
                  : isSuccess
                  ? 'VNPay đã thu tiền • Đang đồng bộ IPN'
                  : 'Chưa thanh toán'}
              </span>
            </div>

            {(order?.totalAmount !== undefined || queryInfo.amountVnd !== undefined) && (
              <div className="flex justify-between items-baseline pt-2.5 border-t border-border-subtle">
                <span className="font-bold text-sm text-text-primary">Số tiền giao dịch:</span>
                <span className="text-xl font-black text-badge-discount">
                  {formatVndPrice(order?.totalAmount ?? queryInfo.amountVnd)}
                </span>
              </div>
            )}
          </div>

          {/* Ordered Items Summary (if Order loaded) */}
          {order && order.items.length > 0 && (
            <div className="border border-border-subtle rounded-2xl p-5 text-xs space-y-2.5">
              <h3 className="font-bold text-text-primary pb-2 border-b border-border-subtle">
                Sản phẩm trong đơn hàng ({order.items.length})
              </h3>
              {order.items.map((item, idx) => {
                const name = item.productName || item.name || 'Sản phẩm';
                const variantLabel =
                  item.variantName || [item.storage, item.color].filter(Boolean).join(' - ');
                const lineTotal =
                  item.subtotal ?? (item.unitPrice ?? item.price ?? 0) * item.quantity;

                return (
                  <div key={idx} className="flex items-center justify-between gap-3 py-1">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-text-primary block truncate">{name}</span>
                      <span className="text-[11px] text-text-secondary">
                        {variantLabel ? `${variantLabel} • ` : ''}SL: x{item.quantity}
                      </span>
                    </div>
                    <span className="font-extrabold text-primary flex-shrink-0">
                      {formatVndPrice(lineTotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {canRetry && (
              <button
                type="button"
                disabled={retryingPayment}
                onClick={() => void handleRetryPayment()}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                <span>
                  {retryingPayment ? 'Đang kết nối VNPay...' : 'Thanh toán lại qua VNPay'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/account', { state: { tab: 'orders' } })}
              className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-surface-tint text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              <span>Xem lịch sử đơn hàng</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-6 py-3 bg-white border border-border-subtle hover:bg-slate-50 text-text-primary font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">storefront</span>
              <span>Tiếp tục mua sắm</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
