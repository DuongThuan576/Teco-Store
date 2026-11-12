import React from 'react';

export const TechNewsSection: React.FC = () => {
  return (
    <>
      {/* ================= TECH NEWS & BUYING GUIDES ================= */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-margin-desktop py-space-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-headline-md font-headline-md text-text-primary">
              Tin tức công nghệ &amp; Tư vấn mua sắm
            </h2>
            <p className="text-xs text-text-secondary">
              Cập nhật tin tức mới nhất, mẹo vặt sử dụng và đánh giá chi tiết thiết bị
            </p>
          </div>
          <a
            className="text-body-sm font-body-strong text-primary hover:underline flex items-center gap-1"
            href="#news"
          >
            Xem tất cả bài viết
            <span className="material-symbols-outlined text-[16px]">
              chevron_right
            </span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Article 1 */}
          <article className="bg-white border border-border-subtle rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
            <div className="h-44 w-full overflow-hidden bg-surface-page">
              <img
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                alt="So sánh chi tiết iPhone Pro Max và Galaxy Ultra"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1OdgXIW53Bqknhr-tsjxR9rZoHmZJxTWMA6_PJQEtjJAI53NAYyJKXMLSZCJOgrQBqfO6PsAYbYnWUD5w2t9hNtRoaq9zKdYAo3Rj9OsSdRfdiLGKbHobbJRNbpRGEBEcBMJlWq7t_5qAktsQkCeiNNnUO0-IICBZMJjqXzMNS-m8QXgY5k_rP53BjNYUMRRsN-Jl9kxy_eJrkC1l1Oo1WGmqIsbz1jrzG7-bhaQCuGts4nmlj44X0g"
              />
            </div>
            <div className="p-4">
              <span className="text-[11px] font-semibold text-primary uppercase">
                Đánh giá chuyên sâu
              </span>
              <h3 className="text-body-strong font-body-strong text-text-primary mt-1 line-clamp-2 group-hover:text-primary transition-colors">
                So sánh chi tiết iPhone 18 Pro Max và Galaxy S24 Ultra: Đâu là ông vua
                công nghệ?
              </h3>
              <p className="text-xs text-text-secondary mt-2 line-clamp-2">
                Phân tích toàn diện hiệu năng chip xử lý, thời lượng pin thực tế và hệ
                thống camera zoom quang học 5x giữa hai flagship đầu bảng.
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle text-[11px] text-text-secondary">
                <span>Teco Tech Editorial</span>
              </div>
            </div>
          </article>

          {/* Article 2 */}
          <article className="bg-white border border-border-subtle rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
            <div className="h-44 w-full overflow-hidden bg-surface-page">
              <img
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                alt="Top 5 Laptop văn phòng mỏng nhẹ"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkBIvtuB_BxUiOoko5p3cO9JbTRn_GRUD0NzNLGxQbuDPr8ZCJ24loAc-kbtHbpmA1P0s8eeM7AfabVhprILJ84D6lTZDq0AwbhvwVFYHEHpr1q-3fkWrDihGj9yfqFOFttY8vBYw_kyFWxB11nD7XlBNBC_x7rUqI0OhQyX8Y5PTcxFkx2nd1CHn073fMDFDXwop0QzHayZw9-SRM8EX2RXZA2aesQuFrFSrcKIVeMxUFGkAyDe184g"
              />
            </div>
            <div className="p-4">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase">
                Tư vấn chọn mua
              </span>
              <h3 className="text-body-strong font-body-strong text-text-primary mt-1 line-clamp-2 group-hover:text-primary transition-colors">
                Top 5 Laptop văn phòng mỏng nhẹ dưới 20 triệu đồng đáng mua nhất cho
                sinh viên &amp; công sở
              </h3>
              <p className="text-xs text-text-secondary mt-2 line-clamp-2">
                Tổng hợp các mẫu máy tính xách tay cấu hình cao, thời lượng pin trên 8
                tiếng và trọng lượng chỉ từ 1.2kg giúp làm việc linh hoạt.
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle text-[11px] text-text-secondary">
                <span>Chuyên gia Laptop</span>
              </div>
            </div>
          </article>

          {/* Article 3 */}
          <article className="bg-white border border-border-subtle rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
            <div className="h-44 w-full overflow-hidden bg-surface-page">
              <img
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                alt="Hướng dẫn quy trình Thu cũ đổi mới tại TecoStore"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCTpsPCHQblTlaNBTnZcllu9-fhPi-e_fykg0FVqaXGe6-hY0v5P1yt2hgT91iE43iSQAOw4XvkVm1_NSpQsKjH8qFdc-S65kjirum8bjjwVDPaC00WbEKi_KadAhr8bL_Ss01C3aT3zJ9QvVfVyEt-A7Yax8I13bE6CkJ4BL75er3a8KUvftesylN19oKu0efXz5ous-7hLqphCAluPGMiKZk_GiDvQ0rGf54XHxjlwKu9vNtKcxssdw"
              />
            </div>
            <div className="p-4">
              <span className="text-[11px] font-semibold text-amber-600 uppercase">
                Cẩm nang người dùng
              </span>
              <h3 className="text-body-strong font-body-strong text-text-primary mt-1 line-clamp-2 group-hover:text-primary transition-colors">
                Hướng dẫn quy trình Thu cũ đổi mới tại TecoStore: Nhận trợ giá
                2.000.000₫ trong 3 phút
              </h3>
              <p className="text-xs text-text-secondary mt-2 line-clamp-2">
                Mọi điều cần biết khi mang điện thoại cũ đổi sang máy mới: Tiêu chuẩn
                thẩm định, sao lưu dữ liệu bảo mật và thủ tục trả góp 0%.
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle text-[11px] text-text-secondary">
                <span>Dịch vụ khách hàng</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* ================= STORE LOCATOR CALLOUT BANNER ================= */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-margin-desktop pb-space-xl">
        <div className="bg-gradient-to-r from-[#0B3B78] to-[#1677E8] rounded-2xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold mb-2">
              <span className="material-symbols-outlined text-[15px] text-yellow-300">
                location_on
              </span>
              Trải nghiệm thực tế tại cửa hàng
            </div>
            <h3 className="text-headline-md font-headline-md text-white">
              Tìm cửa hàng TecoStore tại đây
            </h3>
            <p className="text-xs text-white/80 mt-1">
              Hệ thống Website bán đồ công nghệ 
              UY TÍN -  GIÁ RẺ - HỢP GU
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <button
              type="button"
              className="px-5 py-2.5 bg-white text-primary font-body-strong text-body-sm rounded-lg hover:bg-slate-100 transition-all flex items-center justify-center gap-2 shadow"
            >
              <span className="material-symbols-outlined text-[18px]">near_me</span>
              Tìm cửa hàng ngay
            </button>
            <button
              type="button"
              className="px-5 py-2.5 bg-white/15 border border-white/30 text-white font-body-strong text-body-sm rounded-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                phone_in_talk
              </span>
              Gọi 1800 6999 (Miễn phí)
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

