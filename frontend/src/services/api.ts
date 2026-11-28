import {
  Address,
  AuthResponse,
  BackendCart,
  Brand,
  Category,
  ChangePasswordDTO,
  CreateAddressDTO,
  CreateBrandDTO,
  CreateCategoryDTO,
  CreateOrderDTO,
  CreateProductDTO,
  CreateProductLineDTO,
  CreateReviewDTO,
  CreateVariantDTO,
  CreateVnpayUrlResponse,
  CreateVoucherDTO,
  LoginDTO,
  Order,
  Product,
  ProductLine,
  ProductReviewsResponse,
  ProductVariant,
  RegisterDTO,
  Review,
  StaffOrderStatus,
  UpdateAddressDTO,
  UpdateBrandDTO,
  UpdateCategoryDTO,
  UpdateProductDTO,
  UpdateProductLineDTO,
  UpdateProfileDTO,
  UpdateReviewDTO,
  UpdateVariantDTO,
  UpdateVoucherDTO,
  User,
  ValidateVoucherResponse,
  VariantBySkuResponse,
  VnpayReturnVerifyResponse,
  Voucher,
  VoucherWalletResponse,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

let accessTokenMemory: string | null = null;
try {
  accessTokenMemory = localStorage.getItem('tecostore_access_token');
} catch {}

export function setAccessToken(token: string | null) {
  accessTokenMemory = token;
  try {
    if (token) {
      localStorage.setItem('tecostore_access_token', token);
    } else {
      localStorage.removeItem('tecostore_access_token');
    }
  } catch {}
}

export function getAccessToken(): string | null {
  return accessTokenMemory;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (!res.ok) {
          setAccessToken(null);
          return null;
        }
        const data = (await res.json()) as Partial<AuthResponse>;
        if (data.accessToken) {
          setAccessToken(data.accessToken);
          return data.accessToken;
        }
        setAccessToken(null);
        return null;
      } catch {
        setAccessToken(null);
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

const AUTH_SKIP_REFRESH_ENDPOINTS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
]);

async function fetchJson<T>(
  endpoint: string,
  init?: RequestInit,
  hasRetried = false,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  if (accessTokenMemory) {
    headers['Authorization'] = `Bearer ${accessTokenMemory}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...init,
    headers,
    credentials: init?.credentials ?? 'include',
  });

  if (
    response.status === 401 &&
    !hasRetried &&
    !AUTH_SKIP_REFRESH_ENDPOINTS.has(endpoint)
  ) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return fetchJson<T>(endpoint, init, true);
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const rawMessage = errorBody?.message;
    const formattedMessage = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : rawMessage || `API Error: ${response.status}`;
    throw new Error(formattedMessage);
  }

  return response.json() as Promise<T>;
}

// ================= PRODUCTS API (/api/products) =================
export const productsApi = {
  findAll: () => fetchJson<Product[]>('/products'),
  findOne: (id: string) => fetchJson<Product>(`/products/${id}`),
  findBySlug: (slug: string) => fetchJson<Product>(`/products/slug/${slug}`),
  findVariants: (productId: string) =>
    fetchJson<ProductVariant[]>(`/products/${productId}/variants`),
  findVariantById: (productId: string, variantId: string) =>
    fetchJson<ProductVariant>(`/products/${productId}/variants/${variantId}`),
  findVariantBySku: (slug: string, sku: string) =>
    fetchJson<VariantBySkuResponse>(`/products/slug/${slug}/variants/${sku}`),
  // Admin / Employee CRUD
  create: (dto: CreateProductDTO) =>
    fetchJson<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  update: (id: string, dto: UpdateProductDTO) =>
    fetchJson<Product>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  remove: (id: string) =>
    fetchJson<{ message?: string }>(`/products/${id}`, {
      method: 'DELETE',
    }),
  addVariant: (productId: string, dto: CreateVariantDTO) =>
    fetchJson<Product>(`/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  updateVariant: (productId: string, variantId: string, dto: UpdateVariantDTO) =>
    fetchJson<Product>(`/products/${productId}/variants/${variantId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  removeVariant: (productId: string, variantId: string) =>
    fetchJson<Product>(`/products/${productId}/variants/${variantId}`, {
      method: 'DELETE',
    }),
};

// ================= CATEGORIES API (/api/categories) =================
export const categoriesApi = {
  findAll: () => fetchJson<Category[]>('/categories'),
  findBySlug: (slug: string) => fetchJson<Category>(`/categories/slug/${slug}`),
  create: (dto: CreateCategoryDTO) =>
    fetchJson<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  update: (id: string, dto: UpdateCategoryDTO) =>
    fetchJson<Category>(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  remove: (id: string) =>
    fetchJson<{ message?: string }>(`/categories/${id}`, {
      method: 'DELETE',
    }),
};

// ================= BRANDS API (/api/brands) =================
export const brandsApi = {
  findAll: () => fetchJson<Brand[]>('/brands'),
  findBySlug: (slug: string) => fetchJson<Brand>(`/brands/slug/${slug}`),
  create: (dto: CreateBrandDTO) =>
    fetchJson<Brand>('/brands', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  update: (id: string, dto: UpdateBrandDTO) =>
    fetchJson<Brand>(`/brands/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  remove: (id: string) =>
    fetchJson<{ message?: string }>(`/brands/${id}`, {
      method: 'DELETE',
    }),
};

// ================= PRODUCT LINES API (/api/productlines) =================
export const productLinesApi = {
  findAll: () => fetchJson<ProductLine[]>('/productlines'),
  findBySlug: (slug: string) => fetchJson<ProductLine>(`/productlines/slug/${slug}`),
  create: (dto: CreateProductLineDTO) =>
    fetchJson<ProductLine>('/productlines', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  update: (id: string, dto: UpdateProductLineDTO) =>
    fetchJson<ProductLine>(`/productlines/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  remove: (id: string) =>
    fetchJson<{ message?: string }>(`/productlines/${id}`, {
      method: 'DELETE',
    }),
};

// ================= AUTH API (/api/auth) =================
export const authApi = {
  register: (dto: RegisterDTO) =>
    fetchJson<{ message: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  login: async (dto: LoginDTO) => {
    const res = await fetchJson<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
      credentials: 'include',
    });
    if (res.accessToken) {
      setAccessToken(res.accessToken);
    }
    return res;
  },
  getProfile: () =>
    fetchJson<{ message: string; user: User }>('/auth/me'),
  refreshToken: async () => {
    const res = await fetchJson<AuthResponse>('/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (res.accessToken) {
      setAccessToken(res.accessToken);
    }
    return res;
  },
  logout: async () => {
    try {
      await fetchJson<{ message: string }>('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setAccessToken(null);
    }
  },
};

// ================= USERS API (/api/users) =================
export const usersApi = {
  getMe: () => fetchJson<User>('/users/me'),
  updateProfile: (dto: UpdateProfileDTO) =>
    fetchJson<{ message: string; user: User }>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  changePassword: (dto: ChangePasswordDTO) =>
    fetchJson<{ message: string }>('/users/me/change-password', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
};

// ================= ADDRESSES API (/api/addresses) =================
export const addressesApi = {
  getMyAddresses: () => fetchJson<Address[]>('/addresses/me'),
  createAddress: (dto: CreateAddressDTO) =>
    fetchJson<{ message: string; address: Address }>('/addresses', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  updateAddress: (id: string, dto: UpdateAddressDTO) =>
    fetchJson<{ message: string; address: Address }>(`/addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  setDefaultAddress: (id: string) =>
    fetchJson<{ message: string; address: Address }>(`/addresses/${id}/default`, {
      method: 'PATCH',
    }),
  removeAddress: (id: string) =>
    fetchJson<{ message: string; newDefaultAddressId: string | null }>(`/addresses/${id}`, {
      method: 'DELETE',
    }),
};

// ================= CART API (/api/cart) =================
export const cartApi = {
  getCart: () => fetchJson<BackendCart>('/cart'),
  addItem: (productId: string, sku: string, quantity = 1, variantId?: string) =>
    fetchJson<{ message: string; cart: BackendCart }>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({
        productId,
        sku,
        ...(variantId ? { variantId } : {}),
        quantity,
      }),
    }),
  updateQuantity: (variantIdOrSku: string, quantity: number) =>
    fetchJson<{ message: string; cart: BackendCart }>(`/cart/items/${variantIdOrSku}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),
  removeItem: (variantIdOrSku: string) =>
    fetchJson<{ message: string; cart: BackendCart; totalItems: number }>(
      `/cart/items/${variantIdOrSku}`,
      {
        method: 'DELETE',
      },
    ),
  clearCart: () =>
    fetchJson<{ message: string; totalItems: number }>('/cart', {
      method: 'DELETE',
    }),
};

// ================= VOUCHERS API (/api/vouchers) =================
export const vouchersApi = {
  getMyWallet: () => fetchJson<VoucherWalletResponse>('/vouchers/my-wallet'),
  validateVoucher: (code: string) =>
    fetchJson<ValidateVoucherResponse>('/vouchers/validate', {
      method: 'POST',
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    }),
  getAllVouchers: () => fetchJson<Voucher[]>('/vouchers'),
  getVoucherDetail: (id: string) => fetchJson<Voucher>(`/vouchers/${id}`),
  createVoucher: (dto: CreateVoucherDTO) =>
    fetchJson<{ message: string; voucher: Voucher }>('/vouchers', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  updateVoucher: (id: string, dto: UpdateVoucherDTO) =>
    fetchJson<{ message: string; voucher: Voucher }>(`/vouchers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
};

// ================= ORDERS API (/api/orders) =================
export const ordersApi = {
  createOrder: async (dto: CreateOrderDTO): Promise<Order> => {
    const res = await fetchJson<Order | { order: Order }>('/orders', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return 'order' in res && res.order ? res.order : (res as Order);
  },
  getUserOrders: async (): Promise<Order[]> => {
    const res = await fetchJson<Order[] | { data: Order[] }>('/orders/me');
    return Array.isArray(res) ? res : res.data || [];
  },
  getOrderDetail: (orderId: string) => fetchJson<Order>(`/orders/${orderId}`),
  cancelOrder: (orderId: string) =>
    fetchJson<{ message: string; order: Order }>(`/orders/${orderId}/cancel`, {
      method: 'PATCH',
    }),
  // Admin / Employee endpoints
  getAllOrdersManage: () => fetchJson<Order[]>('/orders/manage'),
  getManagedOrderDetail: (orderId: string) => fetchJson<Order>(`/orders/manage/${orderId}`),
  updateOrderStatus: (orderId: string, status: StaffOrderStatus) =>
    fetchJson<{ message: string; order: Order }>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// ================= PAYMENTS API (/api/payments) =================
export const paymentsApi = {
  createVnpayUrl: (orderId: string) =>
    fetchJson<CreateVnpayUrlResponse>('/payments/vnpay/create-url', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    }),
  verifyVnpayReturn: (queryString: string) => {
    const normalizedQuery = queryString.startsWith('?') ? queryString : `?${queryString}`;
    return fetchJson<VnpayReturnVerifyResponse>(`/payments/vnpay/return${normalizedQuery}`);
  },
};

// ================= REVIEWS API (/api/reviews) =================
export const reviewsApi = {
  getProductReviews: async (productId: string): Promise<ProductReviewsResponse> => {
    const res = await fetchJson<ProductReviewsResponse | Review[]>(
      `/reviews/product/${productId}`,
    );
    if (Array.isArray(res)) {
      return { productId, total: res.length, reviews: res };
    }
    return {
      productId: res.productId || productId,
      total: res.total ?? (res.reviews?.length || 0),
      reviews: res.reviews || [],
    };
  },
  getMyReviews: () => fetchJson<Review[]>('/reviews/me'),
  createReview: (dto: CreateReviewDTO) =>
    fetchJson<{ message: string; review: Review }>('/reviews', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  updateReview: (id: string, dto: UpdateReviewDTO) =>
    fetchJson<{ message: string; review: Review }>(`/reviews/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  deleteReview: (id: string) =>
    fetchJson<{ message: string }>(`/reviews/${id}`, {
      method: 'DELETE',
    }),
  // Admin / Employee Moderation & Shop Reply
  getReviewsForModeration: () => fetchJson<Review[]>('/reviews/manage'),
  moderateReview: (id: string, isHidden: boolean) =>
    fetchJson<{ message: string; review: Review }>(`/reviews/${id}/moderation`, {
      method: 'PATCH',
      body: JSON.stringify({ isHidden }),
    }),
  replyToReview: (id: string, comment: string) =>
    fetchJson<{ message: string }>(`/reviews/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
};

// ================= UI & DATA FORMATTERS =================
export const FALLBACK_PRODUCT_IMAGES = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDETub0-tTwOga21XdjPB-maYjVNzQZ9lPgL48_HaeZm2eqrknhYLwZn-5VB483BtzVsUmsNUOYfpJEXCMuaY87etyRaWevEErdX-aaPUjntWR4jv2m2B0gqYnWEIfCJENaK4D19LCt_gggAIaBNi2NbsXGfGdYEfMeJ52H4YRVOIxA7rThAO5Kh2QHp_RkbkZrsphMu6XZ51z3q4jqzUdFe9Qk34mAEMrymr7ntJoFsXEx4wiYazc87g',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBQKjx03tBcXuCszWhlQkS3Hfkx_IrxTVUZtovGl6IWaRgTS7j_5S_xD9TeUEgoEyOIYw4GMArk0jci6ifK5RWnqV6ZrINoVhKPl6gVYjBEnXun0sNDSbgknuqO1K89lk8Ohns1P2gafRpeOJE1nrxGV4ZnkT2II5opAJrNjPqt5f49qeO7ThkHW4d-uv3pJ5PzdYUgy3JrtDxdJzVjMYzT1sWrhmI7J0MwoxiL8wu2UPj5pIzxGk8AGQ',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCmvFrmJcQeOo50l7tMD29CIqvyWYZ6qjX_Qt3IXUvY8mFOyEt5gOgMZ2Wi6651hFSKIAhf2_G3ryoO7tz5-OLHOoOcfh-Hw8wSe03mtBaebgI6vJTRIl7LuXL6cv9Ao4f2w3eLkLYOlJhfYakecG126DdUIsDngpuTl63ASS0lAO4w6_dgBtVZxXqVNNxHU_bjokjGjBGMhfP77OlPMbZBzdRXermD1bqCmEM4JfL_XW1cUoeRbDSdIQ',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBaIsXE_r-sjFxyvBhFzty6mqJo9P9P8SgeVwtXRpJdMvgtmXJJ3iArpq-cRApa9qnm2eTihZ9Qafv5-wBbE3uhHQ-WdTMm2bOzq1kHxZYc2vqd-fJwEIsL6QHwEYTHTNyb04F-znciORvjwjzImLHaZ9r18UM2-XA732Y4oMjidWG6RDdw1gNIRlIajc-8HXti3vJJB8l96-1zfhTvnUDtMczFLfttJJ4V14eoaVf4-HLNcB-0s_ZejA',
];

export function formatVndPrice(price?: number): string {
  if (price === undefined || price === null || Number.isNaN(price) || price <= 0) {
    return 'Liên hệ';
  }
  return `${price.toLocaleString('vi-VN')}₫`;
}

export function getPrimaryVariant(product: Product): ProductVariant | undefined {
  if (!product.variants || product.variants.length === 0) {
    return undefined;
  }
  const validPriceVariants = product.variants.filter((v) => v.price > 0);
  if (validPriceVariants.length > 0) {
    const inStock = validPriceVariants.filter((v) => (v.stock || 0) > 0);
    const pool = inStock.length > 0 ? inStock : validPriceVariants;
    return [...pool].sort((a, b) => a.price - b.price)[0];
  }

  return product.variants[0];
}

export function getTotalStock(product: Product): number {
  if (!product.variants || product.variants.length === 0) return 0;
  return product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
}

export function getProductImage(product: Product, index = 0): string {
  const validProductImg = product.images?.find(
    (img) => img && !img.includes('example.com'),
  );
  if (validProductImg) return validProductImg;

  const variantWithImg = product.variants?.find((v) =>
    v.images?.some((img) => img && !img.includes('example.com')),
  );
  if (variantWithImg) {
    const img = variantWithImg.images.find((i) => i && !i.includes('example.com'));
    if (img) return img;
  }

  return FALLBACK_PRODUCT_IMAGES[index % FALLBACK_PRODUCT_IMAGES.length];
}

export function getProductSpecChips(product: Product): string[] {
  const chips: string[] = [];
  const specs = product.specifications;
  const primaryVariant = getPrimaryVariant(product);

  if (specs?.cpu && typeof specs.cpu === 'string') {
    chips.push(specs.cpu);
  }
  if (primaryVariant?.storage) {
    chips.push(primaryVariant.storage);
  } else if (specs?.ram && typeof specs.ram === 'string') {
    chips.push(specs.ram);
  }
  if (specs?.screenTechnology && typeof specs.screenTechnology === 'string') {
    chips.push(specs.screenTechnology);
  } else if (specs?.screenSize && typeof specs.screenSize === 'string') {
    chips.push(specs.screenSize);
  }

  if (chips.length === 0 && product.variants?.length > 0) {
    const uniqueStorages = Array.from(
      new Set(product.variants.map((v) => v.storage).filter(Boolean)),
    ) as string[];
    chips.push(...uniqueStorages.slice(0, 3));
  }

  return chips.slice(0, 3);
}
