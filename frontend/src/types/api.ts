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
  ratingAverage?: number;
  ratingCount?: number;
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

export type UserRole = 'customer' | 'admin' | 'employee' | 'staff';

export interface User {
  id?: string;
  _id?: string;
  email: string;
  fullName?: string;
  fullname?: string;
  phone?: string;
  role: UserRole;
  status?: string;
  createdAt?: string;
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

export interface UpdateProfileDTO {
  fullName?: string;
  phone?: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  message?: string;
  accessToken?: string;
  user: User;
}

export interface BackendCartItem {
  productId: string;
  variantId?: string;
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
  _id?: string;
  userId: string;
  items: BackendCartItem[];
  totalItems: number;
  totalAmount?: number;
}

// ================= ADDRESSES (/api/addresses) =================
export interface Address {
  _id: string;
  userId: string;
  receiverName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  address: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAddressDTO {
  receiverName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  address: string;
}

export type UpdateAddressDTO = Partial<CreateAddressDTO>;

// ================= VOUCHERS (/api/vouchers) =================
export type DiscountType = 'percentage' | 'fixed';

export interface Voucher {
  _id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number | null;
  usageLimit: number;
  usageLimitPerUser: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  usedByUser?: number;
  remainingUses?: number;
}

export interface VoucherWalletResponse {
  total: number;
  vouchers: Voucher[];
}

export interface ValidateVoucherResponse {
  valid: boolean;
  voucher: {
    id: string;
    code: string;
    discountType: DiscountType;
    discountValue: number;
  };
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  remainingUses: number;
}

// ================= ORDERS (/api/orders) =================
export interface ShippingAddressSnapshot {
  hoTenNguoiNhan: string;
  soDienThoai: string;
  tinhThanh: string;
  quanHuyen: string;
  phuongXa: string;
  diaChiChiTiet: string;
}

export interface CustomerInfo {
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  city?: string;
  district?: string;
  ward?: string;
  note?: string;
}

export interface OrderItem {
  productId: string;
  variantId?: string;
  productName?: string;
  variantName?: string;
  name?: string;
  slug?: string;
  color?: string;
  storage?: string;
  image?: string;
  sku: string;
  unitPrice?: number;
  price?: number;
  quantity: number;
  subtotal?: number;
}

export type PaymentMethod = 'cod' | 'vnpay';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type OrderStatus =
  | 'cho_xac_nhan'
  | 'da_xac_nhan'
  | 'dang_giao'
  | 'da_giao'
  | 'da_huy'
  | 'pending'
  | 'processing'
  | 'shipping'
  | 'delivered'
  | 'cancelled';

export interface Order {
  _id: string;
  orderCode: string;
  userId: string;
  items: OrderItem[];
  shippingAddress?: ShippingAddressSnapshot;
  customerInfo?: CustomerInfo;
  voucherId?: string | null;
  voucherCode?: string | null;
  subtotal: number;
  discountAmount: number;
  shippingFee?: number;
  totalAmount: number;
  paymentMethod: PaymentMethod | string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrderDTO {
  addressId: string;
  paymentMethod: PaymentMethod;
  voucherCode?: string;
  note?: string;
}

// ================= PAYMENTS - VNPAY (/api/payments) =================
export interface CreateVnpayUrlResponse {
  message: string;
  orderId: string;
  transactionCode: string;
  amount: number;
  expiresAt: string;
  paymentUrl: string;
}

export interface VnpayReturnVerifyResponse {
  valid: boolean;
  orderId?: string;
  transactionCode?: string;
  vnpayReportedSuccess?: boolean;
  paymentStatus?: PaymentStatus;
  message: string;
}

// ================= REVIEWS (/api/reviews) =================
export interface ReviewReplyItem {
  _id: string;
  userId: string;
  parentId: string;
  comment: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Review {
  _id: string;
  userId: string;
  productId: string;
  orderId?: string | null;
  rating: number;
  comment: string;
  isHidden?: boolean;
  replies?: ReviewReplyItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductReviewsResponse {
  productId: string;
  total: number;
  reviews: Review[];
}

export interface CreateReviewDTO {
  orderId: string;
  productId: string;
  rating: number;
  comment: string;
}

export interface UpdateReviewDTO {
  rating?: number;
  comment?: string;
}

export interface CreateProductDTO {
  name: string;
  slug: string;
  description?: string;
  images?: string[];
  isActive?: boolean;
  categoryId?: string;
  brandId?: string;
  productLineId?: string;
  specifications?: Record<string, unknown>;
  variants: Array<{
    sku: string;
    color?: string;
    storage?: string;
    images?: string[];
    price: number;
    stock: number;
  }>;
}

export type UpdateProductDTO = Partial<Omit<CreateProductDTO, 'variants'>>;

export interface CreateVariantDTO {
  sku: string;
  color?: string;
  storage?: string;
  images?: string[];
  price: number;
  stock: number;
}

export type UpdateVariantDTO = Partial<Omit<CreateVariantDTO, 'sku'>>;

export interface CreateCategoryDTO {
  name: string;
  slug: string;
  productType: string;
  parentId?: string | null;
}

export type UpdateCategoryDTO = Partial<CreateCategoryDTO>;

export interface CreateBrandDTO {
  name: string;
  slug: string;
  logo?: string;
  status?: 'active' | 'inactive';
}

export type UpdateBrandDTO = Partial<CreateBrandDTO>;

export interface CreateProductLineDTO {
  name: string;
  slug: string;
  brandId: string;
  categoryId: string;
  parentId?: string | null;
  status?: 'active' | 'inactive';
}

export type UpdateProductLineDTO = Partial<CreateProductLineDTO>;

export interface CreateVoucherDTO {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  usageLimit: number;
  usageLimitPerUser: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export type UpdateVoucherDTO = Partial<CreateVoucherDTO>;

export type StaffOrderStatus = 'da_xac_nhan' | 'dang_giao' | 'da_giao';

export interface CartItem {
  id: string;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  selected?: boolean;
}
