import React from 'react';
import { Brand } from '../types/api';

interface BrandsShowcaseProps {
  brands: Brand[];
  selectedBrandId: string | null;
  onSelectBrand: (brandId: string | null) => void;
}

export const BrandsShowcase: React.FC<BrandsShowcaseProps> = ({
  brands,
  selectedBrandId,
  onSelectBrand,
}) => {
  // Filter active non-test brands from backend
  const activeBackendBrands = brands.filter(
    (b) => b.status === 'active' && !b.slug?.includes('default-status'),
  );

  return (
    <section className="max-w-[1240px] mx-auto px-4 sm:px-margin-desktop py-space-sm">
      <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-headline-sm font-headline-sm text-text-primary">
              Thương hiệu công nghệ đối tác chính hãng
            </h3>
            <p className="text-xs text-text-secondary">
              Cam kết nguồn gốc xuất xứ 100% chính hãng
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-600 items-center gap-1 hidden sm:flex">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            Đại lý ủy quyền cấp 1
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {activeBackendBrands.map((brand) => {
            const isSelected = selectedBrandId === brand._id;
            return (
              <button
                key={brand._id}
                type="button"
                onClick={() => {
                  onSelectBrand(isSelected ? null : brand._id);
                  const el = document.getElementById('products-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`h-14 border rounded-lg flex items-center justify-center gap-2 px-2 transition-all text-xs font-bold bg-surface-page/50 hover:border-primary ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30 bg-blue-50 text-primary'
                    : 'border-border-subtle text-slate-800'
                }`}
                title={`Lọc sản phẩm thương hiệu ${brand.name}`}
              >
                {brand.logo && (
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="h-6 w-6 object-contain rounded"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <span className="truncate">{brand.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

