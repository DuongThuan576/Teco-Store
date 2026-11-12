import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-text-primary dark:bg-inverse-surface py-space-xl px-4 sm:px-margin-desktop border-t border-border-subtle dark:border-outline text-surface-dim">
      <div className="max-w-[1240px] mx-auto">
        {/* 4 Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-slate-700">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-black text-lg">
                T
              </div>
              <span className="text-headline-lg font-headline-lg font-black text-on-primary dark:text-inverse-on-surface">
                TecoStore
              </span>
            </div>
            <p className="text-body-sm font-body-sm text-surface-dim leading-relaxed">
              Hệ thống bán lẻ thiết bị công nghệ chính hãng Việt Nam. Cam
              kết chất lượng dịch vụ, bảo hành chuẩn mực và giá trị thực cho khách hàng.
            </p>
            <div className="mt-4 space-y-1.5 text-xs">
              <p>
                <strong className="text-white">Tổng đài mua hàng:</strong> 1800 6999
                (08:00 - 22:00)
              </p>
              <p>
                <strong className="text-white">Hỗ trợ kỹ thuật:</strong> 1800 6998
                (08:00 - 21:00)
              </p>
              <p>
                <strong className="text-white">Khiếu nại dịch vụ:</strong> 1800 6997
              </p>
              <p>
                <strong className="text-white">Email:</strong> cskh@tecostore.vn
              </p>
            </div>
          </div>

          <div className='lg:col-start-4'>
            <h4 className="text-headline-sm font-headline-sm text-on-primary dark:text-inverse-on-surface mb-3">
              Phương thức thanh toán
            </h4>
            <div className="grid grid-cols-4 gap-2 mb-4 ">
              <div className="bg-white rounded p-1 text-center text-[10px] font-bold text-slate-900 flex items-center justify-center h-8">
                VietQR
              </div>
              <div className="bg-white rounded p-1 text-center text-[10px] font-bold text-blue-700 flex items-center justify-center h-8">
                VNPAY
              </div>
              <div className="bg-white rounded p-1 text-center text-[10px] font-bold text-pink-600 flex items-center justify-center h-8">
                MoMo
              </div>
              <div className="bg-white rounded p-1 text-center text-[10px] font-bold text-blue-900 flex items-center justify-center h-8">
                VISA
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Strip */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between text-caption font-caption text-surface-dim gap-2">
          <p>
            © 2026 TecoStore Vietnam. Bản quyền thuộc về TecoStore.
          </p>
        </div>
      </div>
    </footer>
  );
};

