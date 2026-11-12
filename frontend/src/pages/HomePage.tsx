import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brand, Category, Product } from '../types/api';
import { HeroSection } from '../components/HeroSection';
import { BestSellersSection } from '../components/BestSellersSection';
import { BrandsShowcase } from '../components/BrandsShowcase';
import { TechNewsSection } from '../components/TechNewsSection';

interface HomePageProps {
  categories: Category[];
  brands: Brand[];
  products: Product[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  onClearFilters: () => void;
  onSelectProduct: (product: Product) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  categories,
  brands,
  products,
  loading,
  error,
  searchQuery,
  onClearFilters,
}) => {
  const navigate = useNavigate();

  return (
    <>
      {/* Hero Section with Clickbuy-style Mega Menu Hover Flyout */}
      <HeroSection
        categories={categories}
        brands={brands}
        products={products}
        onNavigateCategory={(catSlug, brandSlug) => {
          if (brandSlug) {
            navigate(`/category/${catSlug}?brand=${brandSlug}`);
          } else {
            navigate(`/category/${catSlug}`);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSearchHot={(query) => {
          navigate(`/category/all?q=${encodeURIComponent(query)}`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Best Sellers Section */}
      <BestSellersSection
        products={products}
        categories={categories}
        brands={brands}
        loading={loading}
        error={error}
        selectedCategoryId={null}
        onSelectCategory={(catId) => {
          const targetCat = categories.find((c) => c._id === catId);
          if (targetCat) {
            navigate(`/category/${targetCat.slug}`);
          }
        }}
        selectedBrandId={null}
        onSelectBrand={(brandId) => {
          const targetBrand = brands.find((b) => b._id === brandId);
          if (targetBrand) {
            navigate(`/category/dien-thoai?brand=${targetBrand.slug}`);
          }
        }}
        searchQuery={searchQuery}
        onClearFilters={onClearFilters}
        onSelectProduct={(product) => {
          navigate(`/product/${product.slug}`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Official Brands Showcase */}
      <BrandsShowcase
        brands={brands}
        selectedBrandId={null}
        onSelectBrand={(brandId) => {
          const targetBrand = brands.find((b) => b._id === brandId);
          if (targetBrand) {
            navigate(`/category/dien-thoai?brand=${targetBrand.slug}`);
          }
        }}
      />

      {/* Tech News & Store Locator Banner (Section 5) */}
      <TechNewsSection />
    </>
  );
};


