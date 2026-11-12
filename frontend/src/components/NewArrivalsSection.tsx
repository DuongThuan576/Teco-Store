import React from 'react';
import { Product } from '../types/api';
import { formatVndPrice, getPrimaryVariant, getProductImage } from '../services/api';

interface NewArrivalsSectionProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const NewArrivalsSection: React.FC<NewArrivalsSectionProps> = ({
  products,
  onSelectProduct,
}) => {
  const activeProducts = products.filter((p) => p.isActive);

  if (activeProducts.length === 0) {
    return null;
  }

  // Map directly from active products in DB
  const displayCards = activeProducts.slice(0, 4).map((p, idx) => {
    const primary = getPrimaryVariant(p);
    const specs = p.specifications;
    const subParts = [specs?.cpu, specs?.screenSize, primary?.storage].filter(Boolean);
    return {
      id: p._id,
      badge: 'Mới về',
      badgeClass: 'bg-badge-discount text-white',
      name: p.name,
      subtitle:
        subParts.length > 0 ? subParts.join(' • ') : `${p.variants?.length || 1} phiên bản`,
      price: formatVndPrice(primary?.price),
      image: getProductImage(p, idx),
      product: p,
    };
  });

  return (
    <section className="max-w-[1240px] mx-auto px-4 sm:px-margin-desktop py-space-md">
      <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
              Bộ sưu tập 2026
            </span>
            <h2 className="text-headline-md font-headline-md text-text-primary mt-1">
              Sản phẩm công nghệ mới ra mắt
            </h2>
          </div>
          <a
            className="text-body-sm font-body-strong text-primary hover:underline flex items-center gap-1"
            href="#products-section"
          >
            Xem tất cả hàng mới
            <span className="material-symbols-outlined text-[16px]">
              arrow_forward
            </span>
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayCards.map((card) => (
            <div
              key={card.id}
              onClick={() => {
                if (card.product) onSelectProduct(card.product);
              }}
              className={`border border-border-subtle rounded-xl p-3 hover:border-primary transition-all flex gap-3 items-center group ${
                card.product ? 'cursor-pointer' : ''
              }`}
            >
              <div className="w-24 h-24 rounded-lg bg-surface-page flex-shrink-0 p-1 overflow-hidden">
                <img
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  alt={card.name}
                  src={card.image}
                />
              </div>
              <div className="min-w-0">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${card.badgeClass}`}
                >
                  {card.badge}
                </span>
                <h4 className="text-body-strong font-body-strong text-text-primary line-clamp-1 mt-1 group-hover:text-primary">
                  {card.name}
                </h4>
                <p className="text-[11px] text-text-secondary line-clamp-1">
                  {card.subtitle}
                </p>
                <div className="text-price-md font-price-md text-badge-discount mt-1">
                  {card.price}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

