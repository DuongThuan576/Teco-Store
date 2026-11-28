import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Brand, Category, Product, ProductVariant, CartItem, ProductLine, User, Order } from './types/api';
import { authApi, brandsApi, categoriesApi, productLinesApi, productsApi, cartApi, getAccessToken, registerConfirmHandler } from './services/api';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AccountPage } from './pages/AccountPage';
import { PaymentReturnPage } from './pages/PaymentReturnPage';
import { AdminPortalPage } from './pages/AdminPortalPage';
import { ProductCompareBarAndModal } from './components/ProductCompareModal';

export const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminWorkspace = location.pathname.startsWith('/admin');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(() => Boolean(getAccessToken()));
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
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    resolve: (confirmed: boolean) => void;
  } | null>(null);
  const [compareProducts, setCompareProducts] = useState<Product[]>([]);

  // Lưu cart vào localStorage mỗi khi thay đổi
  useEffect(() => {
    try {
      localStorage.setItem('tecostore_cart', JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  // Hỗ trợ lăn chuột dọc để cuộn ngang mượt mà khi di chuột vào các thanh cuộn ngang (.thin-scrollbar)
  useEffect(() => {
    const handleHorizontalWheel = (e: WheelEvent) => {
      const container = (e.target as HTMLElement | null)?.closest(
        '.thin-scrollbar',
      ) as HTMLElement | null;
      if (!container) return;

      // Chỉ xử lý khi phần tử có nội dung tràn chiều ngang và không phải bảng cuộn dọc lớn
      const canScrollHorizontally = container.scrollWidth > container.clientWidth + 2;
      const canScrollVertically = container.scrollHeight > container.clientHeight + 10;

      if (canScrollHorizontally && !canScrollVertically && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    window.addEventListener('wheel', handleHorizontalWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleHorizontalWheel);
    };
  }, []);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Đồng bộ giỏ hàng từ Backend MongoDB khi người dùng Customer đăng nhập
  useEffect(() => {
    if (currentUser && currentUser.role === 'customer') {
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
                      _id: item.variantId,
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
                  _id: item.variantId,
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
      setAuthChecking(true);
      authApi
        .getProfile()
        .then((res) => {
          if (isMounted && res.user) {
            setCurrentUser(res.user);
          }
        })
        .catch(() => {
          // Token expired or invalid
        })
        .finally(() => {
          if (isMounted) setAuthChecking(false);
        });
    } else {
      setAuthChecking(false);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshCatalog = async () => {
    const [productsData, categoriesData, brandsData, productLinesData] = await Promise.all([
      productsApi.findAll(),
      categoriesApi.findAll().catch(() => [] as Category[]),
      brandsApi.findAll().catch(() => [] as Brand[]),
      productLinesApi.findAll().catch(() => [] as ProductLine[]),
    ]);
    setProducts(productsData);
    setCategories(categoriesData);
    setBrands(brandsData);
    setProductLines(productLinesData);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Thay thế hộp thoại alert() mặc định của trình duyệt bằng Toast thông báo xanh dương hiện đại
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message?: unknown) => {
      showToast(message !== undefined && message !== null ? String(message) : 'Thông báo hệ thống');
    };

    registerConfirmHandler((message, title) => {
      return new Promise<boolean>((resolve) => {
        setConfirmState({
          title: title || 'Xác nhận thao tác TecoStore',
          message,
          resolve,
        });
      });
    });

    return () => {
      window.alert = originalAlert;
      registerConfirmHandler(null);
    };
  }, []);

  const compareIds = compareProducts.map((p) => p._id);

  const handleToggleCompare = (product: Product) => {
    setCompareProducts((prev) => {
      const exists = prev.some((p) => p._id === product._id);
      if (exists) {
        return prev.filter((p) => p._id !== product._id);
      }
      if (prev.length >= 4) {
        showToast('Chỉ có thể so sánh tối đa 4 sản phẩm cùng lúc.');
        return prev;
      }
      showToast(`Đã thêm "${product.name}" vào danh sách so sánh!`);
      return [...prev, product];
    });
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
      await cartApi.addItem(product._id, primaryVar.sku, 1, primaryVar._id);
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
                  _id: item.variantId,
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
              _id: item.variantId,
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

  const renderBlueToast = () => {
    return (
      <>
        {toastMessage && (
          <div className="fixed top-5 right-5 z-[110] max-w-sm w-full sm:w-auto min-w-[310px] bg-white border border-blue-200 rounded-2xl shadow-2xl shadow-blue-900/15 overflow-hidden transition-all duration-200">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#0B3B78] via-[#005ab6] to-[#0472e3]" />
            <div className="p-3.5 sm:p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#005ab6] to-[#0472e3] text-white flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[20px]">
                  notifications_active
                </span>
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">
                  Thông báo TecoStore
                </div>
                <p className="text-xs font-semibold text-slate-800 mt-0.5 leading-relaxed">
                  {toastMessage}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="w-6 h-6 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                title="Đóng thông báo"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {confirmState && (
          <div
            className="fixed inset-0 z-[120] bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => {
              confirmState.resolve(false);
              setConfirmState(null);
            }}
          >
            <div
              className="bg-white border border-blue-200 rounded-3xl max-w-md w-full shadow-2xl shadow-blue-900/20 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-2 w-full bg-gradient-to-r from-[#0B3B78] via-[#005ab6] to-[#0472e3]" />
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#005ab6] to-[#0472e3] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/25">
                    <span className="material-symbols-outlined text-[24px]">
                      help
                    </span>
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="text-base font-extrabold text-slate-900">
                      {confirmState.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-line">
                      {confirmState.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      confirmState.resolve(false);
                      setConfirmState(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      confirmState.resolve(true);
                      setConfirmState(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#005ab6] to-[#0472e3] hover:from-[#0B3B78] hover:to-[#005ab6] text-white font-extrabold text-xs shadow-md shadow-blue-600/25 cursor-pointer transition-all"
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // Nếu đường dẫn là /admin/* -> Hiển thị giao diện Enterprise Admin độc lập hoàn toàn (Sidebar trái, không chung Header/Footer website bán hàng)
  if (isAdminWorkspace) {
    return (
      <>
        {renderBlueToast()}
        <AdminPortalPage
          currentUser={currentUser}
          loadingAuth={authChecking}
          products={products}
          categories={categories}
          brands={brands}
          productLines={productLines}
          onRefreshCatalog={refreshCatalog}
          onLogoutSuccess={() => {
            setCurrentUser(null);
            showToast('Đã đăng xuất khỏi hệ thống quản trị.');
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-page text-text-primary font-body-default">
      {/* Toast Notification */}
      {renderBlueToast()}

      {/* Global Header */}
      <Header
        categories={categories}
        products={products}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartCount={cartCount}
        currentUser={currentUser}
        onLogout={() => {
          setCurrentUser(null);
          showToast('Đã đăng xuất tài khoản thành công.');
        }}
      />

      {/* Page Routing (Trang chủ, Danh mục, Chi tiết sản phẩm, Giỏ hàng, Đăng nhập, Đăng ký, Tài khoản) */}
      <main className="flex-1 pb-12 sm:pb-16">
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
                onAddToCart={(prod, isBuyNow) =>
                  handleAddToCart(prod, undefined, isBuyNow)
                }
                compareIds={compareIds}
                onToggleCompare={handleToggleCompare}
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
                onAddToCart={(prod, isBuyNow) =>
                  handleAddToCart(prod, undefined, isBuyNow)
                }
                compareIds={compareIds}
                onToggleCompare={handleToggleCompare}
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
                currentUser={currentUser}
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
                                  _id: item.variantId,
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
                              _id: item.variantId,
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
                      } else {
                        setCartItems([]);
                      }
                    })
                    .catch(() => setCartItems([]));
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
                products={products}
                onUserUpdated={(updatedUser) => setCurrentUser(updatedUser)}
                onLogoutSuccess={(customMessage) => {
                  setCurrentUser(null);
                  showToast(customMessage || 'Đã đăng xuất tài khoản thành công.');
                }}
              />
            }
          />

          {/* 8. Trang Kết quả thanh toán VNPay: /payment/vnpay-return */}
          <Route path="/payment/vnpay-return" element={<PaymentReturnPage />} />
          <Route path="/vnpay-return" element={<PaymentReturnPage />} />

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
                onAddToCart={(prod, isBuyNow) =>
                  handleAddToCart(prod, undefined, isBuyNow)
                }
                compareIds={compareIds}
                onToggleCompare={handleToggleCompare}
              />
            }
          />
        </Routes>
      </main>

      {/* Thanh & Bảng So sánh sản phẩm */}
      <ProductCompareBarAndModal
        compareProducts={compareProducts}
        brands={brands}
        categories={categories}
        onRemoveCompare={(productId) =>
          setCompareProducts((prev) => prev.filter((p) => p._id !== productId))
        }
        onClearCompare={() => setCompareProducts([])}
        onAddToCart={(prod, isBuyNow) =>
          handleAddToCart(prod, undefined, isBuyNow)
        }
      />

      {/* Global Footer */}
      <Footer />
    </div>
  );
};

export default App;
