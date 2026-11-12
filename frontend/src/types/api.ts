export interface ProductVariant {
  _id?: string;
  sku: string;
  color?: string;
  storage?: string;
  images: string[];
  price: number;
  stock: number;
}

export interface ProductSpecifications {
  screenSize?: string;
  screenTechnology?: string;
  cpu?: string;
  operatingSystem?: string;
  ram?: string;
  rearCamera?: string;
  frontCamera?: string;
  sim?: string;
  waterResistance?: boolean;
  [key: string]: unknown;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  isActive: boolean;
  categoryId?: string;
  brandId?: string;
  productLineId?: string;
  specifications?: ProductSpecifications | null;
  variants: ProductVariant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface VariantBySkuResponse {
  product: {
    _id: string;
    name: string;
    slug: string;
    description: string;
    images: string[];
    specifications?: ProductSpecifications | null;
    isActive: boolean;
  };
  variant: ProductVariant;
  variants: ProductVariant[];
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  productType: string;
  parentId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Brand {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  status: 'active' | 'inactive';
  categoryIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductLine {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  brandId: string;
  categoryId: string;
  parentId?: string | null;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export type UserRole = 'customer' | 'admin' | 'staff';

export interface User {
  id?: string;
  _id?: string;
  email: string;
  fullName?: string;
  fullname?: string;
  phone?: string;
  role: UserRole;
  status?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthResponse {
  message?: string;
  accessToken?: string;
  user: User;
}

export interface BackendCartItem {
  productId: string;
  sku: string;
  name: string;
  slug: string;
  color?: string;
  storage?: string;
  image?: string;
  price: number;
  quantity: number;
  stock?: number;
  isAvailable?: boolean;
}

export interface BackendCart {
  _id: string;
  userId: string;
  items: BackendCartItem[];
  totalItems: number;
  totalAmount: number;
}

export interface CustomerInfo {
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  city?: string;
  district?: string;
  note?: string;
}

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  slug: string;
  color?: string;
  storage?: string;
  image?: string;
  price: number;
  quantity: number;
}

export type PaymentMethod = 'cod' | 'bank_transfer' | 'online';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type OrderStatus = 'pending' | 'processing' | 'shipping' | 'delivered' | 'cancelled';

export interface Order {
  _id: string;
  orderCode: string;
  userId: string;
  customerInfo: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  merchantInfo?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrderDTO {
  customerInfo: CustomerInfo;
  selectedSkus?: string[];
  items?: Array<{ productId: string; sku: string; quantity: number }>;
  paymentMethod?: PaymentMethod;
  promoCode?: string;
  discountAmount?: number;
  merchantInfo?: Record<string, unknown>;
}

export interface CartItem {
  id: string;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  selected?: boolean;
}


