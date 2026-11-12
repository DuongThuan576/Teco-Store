import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type CartDocument = HydratedDocument<Cart>;

@Schema({ _id: false })
export class CartItem {
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

  @Prop({ required: true, min: 1, default: 1 })
  quantity: number;
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
