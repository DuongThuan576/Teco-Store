import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type CartDocument = HydratedDocument<Cart>;

@Schema({ _id: false })
export class CartItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: false })
  variantId?: Types.ObjectId;

  @Prop({ required: false, trim: true, default: '' })
  sku: string;

  @Prop({ default: '', trim: true })
  name?: string;

  @Prop({ default: '', trim: true })
  slug?: string;

  @Prop({ default: '', trim: true })
  color?: string;

  @Prop({ default: '', trim: true })
  storage?: string;

  @Prop({ default: '' })
  image?: string;

  @Prop({ required: false, min: 0, default: 0 })
  price?: number;

  @Prop({ required: true, min: 1, default: 1 })
  quantity: number;

  @Prop({ type: Date, default: Date.now })
  addedAt?: Date;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({
  collection: 'carts',
  timestamps: true,
})
export class Cart {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
