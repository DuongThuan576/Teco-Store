import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

export enum PaymentMethod {
  COD = 'cod',
  BANK_TRANSFER = 'bank_transfer',
  ONLINE = 'online',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPING = 'shipping',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Schema({ _id: false })
export class CustomerInfo {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true, trim: true })
  shippingAddress: string;

  @Prop({ default: '', trim: true })
  city: string;

  @Prop({ default: '', trim: true })
  district: string;

  @Prop({ default: '', trim: true })
  note: string;
}

export const CustomerInfoSchema = SchemaFactory.createForClass(CustomerInfo);

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  sku: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  slug: string;

  @Prop({ default: '', trim: true })
  color: string;

  @Prop({ default: '', trim: true })
  storage: string;

  @Prop({ default: '' })
  image: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 1 })
  quantity: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({
  collection: 'orders',
  timestamps: true,
})
export class Order {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  orderCode: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: CustomerInfoSchema, required: true })
  customerInfo: CustomerInfo;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ default: 0, min: 0 })
  discountAmount: number;

  @Prop({ default: 0, min: 0 })
  shippingFee: number;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({
    type: String,
    enum: Object.values(PaymentMethod),
    default: PaymentMethod.COD,
  })
  paymentMethod: PaymentMethod;

  @Prop({
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
  })
  orderStatus: OrderStatus;

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  merchantInfo: Record<string, unknown>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ userId: 1, createdAt: -1 });
