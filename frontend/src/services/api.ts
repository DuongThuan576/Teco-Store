import {
  AuthResponse,
  BackendCart,
  Brand,
  Category,
  CreateOrderDTO,
  LoginDTO,
  Order,
  Product,
  ProductLine,
  ProductVariant,
  RegisterDTO,
  User,
  VariantBySkuResponse,
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

async function fetchJson<T>(endpoint: string, init?: RequestInit): Promise<T> {
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
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `API Error: ${response.status}`);
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
};

// ================= CATEGORIES API (/api/categories) =================
export const categoriesApi = {
  findAll: () => fetchJson<Category[]>('/categories'),
  findBySlug: (slug: string) => fetchJson<Category>(`/categories/slug/${slug}`),
};

// ================= BRANDS API (/api/brands) =================
export const brandsApi = {
  findAll: () => fetchJson<Brand[]>('/brands'),
  findBySlug: (slug: string) => fetchJson<Brand>(`/brands/slug/${slug}`),
};

// ================= PRODUCT LINES API (/api/productlines) =================
export const productLinesApi = {
  findAll: () => fetchJson<ProductLine[]>('/productlines'),
  findBySlug: (slug: string) => fetchJson<ProductLine>(`/productlines/slug/${slug}`),
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

// ================= CART API (/api/cart) =================
export const cartApi = {
  getCart: () => fetchJson<BackendCart>('/cart'),
  addItem: (productId: string, sku: string, quantity = 1) =>
    fetchJson<BackendCart>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, sku, quantity }),
    }),
  updateQuantity: (sku: string, quantity: number) =>
    fetchJson<BackendCart>(`/cart/items/${sku}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),
  removeItem: (sku: string) =>
    fetchJson<BackendCart>(`/cart/items/${sku}`, {
      method: 'DELETE',
    }),
  clearCart: () =>
    fetchJson<{ message: string; items: []; totalItems: 0; totalAmount: 0 }>('/cart', {
      method: 'DELETE',
    }),
};

// ================= ORDERS API (/api/orders) =================
export const ordersApi = {
  createOrder: (dto: CreateOrderDTO) =>
    fetchJson<{ message: string; order: Order }>('/orders', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  getUserOrders: (page = 1, limit = 10) =>
    fetchJson<{
      data: Order[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/orders?page=${page}&limit=${limit}`),
  getOrderDetail: (idOrCode: string) => fetchJson<Order>(`/orders/${idOrCode}`),
  cancelOrder: (idOrCode: string) =>
    fetchJson<{ message: string; order: Order }>(`/orders/${idOrCode}/cancel`, {
      method: 'PATCH',
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
  // Ưu tiên các biến thể có giá thực tế > 0
  const validPriceVariants = product.variants.filter((v) => v.price > 0);
  if (validPriceVariants.length > 0) {
    const inStock = validPriceVariants.filter((v) => (v.stock || 0) > 0);
    const pool = inStock.length > 0 ? inStock : validPriceVariants;
    return [...pool].sort((a, b) => a.price - b.price)[0];
  }

  // Nếu không có biến thể nào có giá > 0, lấy biến thể đầu tiên
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

