import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Brand, Category, Product, ProductVariant, CartItem, ProductLine, User, Order } from './types/api';
import { authApi, brandsApi, categoriesApi, productLinesApi, productsApi, cartApi, getAccessToken } from './services/api';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AccountPage } from './pages/AccountPage';

export const App: React.FC = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart State (lưu trữ danh sách sản phẩm thật người dùng thêm vào)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('tecostore_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Lưu cart vào localStorage mỗi khi thay đổi
  useEffect(() => {
    try {
      localStorage.setItem('tecostore_cart', JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Đồng bộ giỏ hàng từ Backend MongoDB khi người dùng đăng nhập
  useEffect(() => {
    if (currentUser) {
      cartApi
        .getCart()
        .then((bCart) => {
          if (bCart?.items) {
            setCartItems(
              bCart.items.map((item) => ({
                id: `${item.productId}-${item.sku}`,
                product: {
                  _id: item.productId,
                  name: item.name,
                  slug: item.slug,
                  description: '',
                  images: item.image ? [item.image] : [],
                  isActive: true,
                  variants: [
                    {
                      sku: item.sku,
                      price: item.price,
                      stock: item.stock ?? 10,
                      color: item.color,
                      storage: item.storage,
                      images: item.image ? [item.image] : [],
                    },
                  ],
                },
                variant: {
                  sku: item.sku,
                  price: item.price,
                  stock: item.stock ?? 10,
                  color: item.color,
                  storage: item.storage,
                  images: item.image ? [item.image] : [],
                },
                quantity: item.quantity,
              })),
            );
          }
        })
        .catch(() => {});
    } else {
      setCartItems([]);
    }
  }, [currentUser]);

  // Fetch initial data from NestJS Backend APIs
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      productsApi.findAll(),
      categoriesApi.findAll().catch(() => [] as Category[]),
      brandsApi.findAll().catch(() => [] as Brand[]),
      productLinesApi.findAll().catch(() => [] as ProductLine[]),
    ])
      .then(([productsData, categoriesData, brandsData, productLinesData]) => {
        if (!isMounted) return;
        setProducts(productsData);
        setCategories(categoriesData);
        setBrands(brandsData);
        setProductLines(productLinesData);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Lỗi kết nối máy chủ');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Check if token exists, load current profile
    if (getAccessToken()) {
      authApi
        .getProfile()
        .then((res) => {
          if (isMounted && res.user) {
            setCurrentUser(res.user);
          }
        })
        .catch(() => {
          // Token expired or invalid
        });
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const handleAddToCart = async (
    product: Product,
    variant?: ProductVariant,
    isBuyNow = false,
  ) => {
    // YÊU CẦU PHÂN QUYỀN: Phải đăng nhập mới được thêm vào giỏ hàng và mua hàng
    if (!currentUser) {
      showToast('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng và đặt hàng.');
      navigate('/login', {
        state: { from: `/product/${product.slug}` },
      });
      return;
    }

    const primaryVar = variant || product.variants?.[0];
    if (!primaryVar) return;

    try {
      await cartApi.addItem(product._id, primaryVar.sku, 1);
      const bCart = await cartApi.getCart();
      if (bCart?.items) {
        setCartItems(
          bCart.items.map((item) => ({
            id: `${item.productId}-${item.sku}`,
            product: {
              _id: item.productId,
              name: item.name,
              slug: item.slug,
              description: '',
              images: item.image ? [item.image] : [],
              isActive: true,
              variants: [
                {
                  sku: item.sku,
                  price: item.price,
                  stock: item.stock ?? 10,
                  color: item.color,
                  storage: item.storage,
                  images: item.image ? [item.image] : [],
                },
              ],
            },
            variant: {
              sku: item.sku,
              price: item.price,
              stock: item.stock ?? 10,
              color: item.color,
              storage: item.storage,
              images: item.image ? [item.image] : [],
            },
            quantity: item.quantity,
          })),
        );
      }

      const variantLabel = primaryVar
        ? ` (${[primaryVar.storage, primaryVar.color].filter(Boolean).join(' - ')})`
        : '';
      showToast(`Đã thêm ${product.name}${variantLabel} vào giỏ hàng!`);

      if (isBuyNow) {
        navigate('/cart');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi thêm sản phẩm vào giỏ hàng');
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    const item = cartItems.find((i) => i.id === itemId);
    if (!item) return;

    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    if (currentUser && item.variant?.sku) {
      try {
        await cartApi.updateQuantity(item.variant.sku, newQty);
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Lỗi cập nhật số lượng');
      }
    }

    setCartItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i)),
    );
  };

  const handleRemoveItem = async (itemId: string) => {
    const item = cartItems.find((i) => i.id === itemId);
    if (currentUser && item?.variant?.sku) {
      try {
        await cartApi.removeItem(item.variant.sku);
      } catch {}
    }
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
    showToast('Đã xóa sản phẩm khỏi giỏ hàng.');
  };

  const handleClearSelected = async (itemIds: string[]) => {
    if (currentUser) {
      for (const id of itemIds) {
        const item = cartItems.find((i) => i.id === id);
        if (item?.variant?.sku) {
          await cartApi.removeItem(item.variant.sku).catch(() => {});
        }
      }
    }
    setCartItems((prev) => prev.filter((i) => !itemIds.includes(i.id)));
    showToast(`Đã xóa ${itemIds.length} sản phẩm khỏi giỏ hàng.`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-page text-text-primary font-body-default">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border border-slate-700 animate-bounce">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Header */}
      <Header
        categories={categories}
        products={products}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartCount={cartCount}
        currentUser={currentUser}
      />

      {/* Page Routing (Trang chủ, Danh mục, Chi tiết sản phẩm, Giỏ hàng, Đăng nhập, Đăng ký, Tài khoản) */}
      <main className="flex-1">
        <Routes>
          {/* 1. Trang chủ */}
          <Route
            path="/"
            element={
              <HomePage
                categories={categories}
                brands={brands}
                products={products}
                loading={loading}
                error={error}
                searchQuery={searchQuery}
                onClearFilters={() => setSearchQuery('')}
                onSelectProduct={() => {}}
              />
            }
          />

          {/* 2. Trang Danh mục riêng: /category/:slug */}
          <Route
            path="/category/:slug"
            element={
              <CategoryPage
                categories={categories}
                brands={brands}
                products={products}
                productLines={productLines}
                loading={loading}
                onAddToCart={(prod) => handleAddToCart(prod)}
              />
            }
          />

          {/* 3. Trang Chi tiết sản phẩm riêng: /product/:slug */}
          <Route
            path="/product/:slug"
            element={
              <ProductDetailPage
                categories={categories}
                brands={brands}
                onAddToCart={(prod, v, isBuyNow) => handleAddToCart(prod, v, isBuyNow)}
              />
            }
          />

          {/* 4. Trang Giỏ hàng riêng: /cart */}
          <Route
            path="/cart"
            element={
              <CartPage
                cartItems={cartItems}
                currentUser={currentUser}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onClearSelected={handleClearSelected}
                onOrderSuccess={(order) => {
                  showToast(`Đơn hàng #${order.orderCode} đã được tạo thành công!`);
                  setCartItems([]);
                }}
              />
            }
          />

          {/* 5. Trang Đăng nhập riêng: /login */}
          <Route
            path="/login"
            element={
              <LoginPage
                currentUser={currentUser}
                onLoginSuccess={(user) => {
                  setCurrentUser(user);
                  showToast(`Chào mừng ${user.fullName || user.fullname || 'bạn'} đã đăng nhập thành công!`);
                }}
              />
            }
          />

          {/* 6. Trang Đăng ký riêng: /register */}
          <Route
            path="/register"
            element={
              <RegisterPage
                currentUser={currentUser}
                onRegisterSuccess={() => {
                  showToast('Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.');
                }}
              />
            }
          />

          {/* 7. Trang Tài khoản riêng: /account */}
          <Route
            path="/account"
            element={
              <AccountPage
                currentUser={currentUser}
                onLogoutSuccess={() => {
                  setCurrentUser(null);
                  showToast('Đã đăng xuất tài khoản thành công.');
                }}
              />
            }
          />

          {/* Fallback route */}
          <Route
            path="*"
            element={
              <HomePage
                categories={categories}
                brands={brands}
                products={products}
                loading={loading}
                error={error}
                searchQuery={searchQuery}
                onClearFilters={() => setSearchQuery('')}
                onSelectProduct={() => {}}
              />
            }
          />
        </Routes>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
};

export default App;
