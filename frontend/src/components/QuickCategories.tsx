import React from 'react';
import { Category, Product } from '../types/api';

interface QuickCategoriesProps {
  categories: Category[];
  products: Product[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

interface QuickCatItem {
  id: string | null;
  name: string;
  subtitle: string;
  icon: string;
  colorClasses: string;
}

export const QuickCategories: React.FC<QuickCategoriesProps> = ({
  categories,
  products,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const realCategories = categories.filter((c) => c.productType !== 'test');

  const stylePresets: Record<string, { icon: string; colorClasses: string; defaultSub: string }> = {
    'dien-thoai': {
      icon: 'smartphone',
      colorClasses:
        'bg-blue-50 border-blue-100 text-primary group-hover:bg-primary group-hover:text-white',
      defaultSub: 'Chính hãng VN/A',
    },
    laptop: {
      icon: 'laptop_mac',
      colorClasses:
        'bg-cyan-50 border-cyan-100 text-cyan-700 group-hover:bg-cyan-700 group-hover:text-white',
      defaultSub: 'Pin trâu, mỏng nhẹ',
    },
    'phu-kien': {
      icon: 'headphones',
      colorClasses:
        'bg-emerald-50 border-emerald-100 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white',
      defaultSub: 'Âm thanh & Sạc',
    },
    'ban-phim': {
      icon: 'keyboard',
      colorClasses:
        'bg-violet-50 border-violet-100 text-violet-700 group-hover:bg-violet-700 group-hover:text-white',
      defaultSub: 'Cơ & Không dây',
    },
  };

  // Map backend categories directly
  const dynamicItems: QuickCatItem[] = realCategories.map((cat) => {
    const count = products.filter((p) => p.categoryId === cat._id && p.isActive).length;
    const preset = stylePresets[cat.slug] || {
      icon: cat.productType === 'phone' ? 'smartphone' : cat.productType === 'laptop' ? 'laptop_mac' : 'devices',
      colorClasses:
        'bg-slate-100 border-slate-200 text-slate-800 group-hover:bg-slate-800 group-hover:text-white',
      defaultSub: 'Chính hãng',
    };
    return {
      id: cat._id,
      name: cat.name,
      subtitle: count > 0 ? `${count} sản phẩm` : preset.defaultSub,
      icon: preset.icon,
      colorClasses: preset.colorClasses,
    };
  });

  return (
    <section className="max-w-[1240px] mx-auto px-4 sm:px-margin-desktop py-space-md">
      <div className="bg-white border border-border-subtle rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-headline-sm font-headline-sm text-text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">
              grid_view
            </span>
            Danh mục nổi bật ({dynamicItems.length})
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {dynamicItems.map((item, idx) => {
            const isSelected = item.id !== null && selectedCategoryId === item.id;
            return (
              <a
                key={`${item.name}-${idx}`}
                href="#products-section"
                onClick={(e) => {
                  e.preventDefault();
                  onSelectCategory(isSelected ? null : item.id);
                  const el = document.getElementById('products-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`flex flex-col items-center p-2.5 rounded-xl hover:bg-surface-page hover:-translate-y-1 transition-all group text-center cursor-pointer ${
                  isSelected ? 'ring-2 ring-primary bg-blue-50/40' : ''
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-colors mb-2 ${item.colorClasses}`}
                >
                  <span className="material-symbols-outlined text-[28px]">
                    {item.icon}
                  </span>
                </div>
                <span className="text-body-sm font-body-strong text-text-primary line-clamp-1">
                  {item.name}
                </span>
                <span className="text-[11px] text-text-secondary line-clamp-1">
                  {item.subtitle}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

