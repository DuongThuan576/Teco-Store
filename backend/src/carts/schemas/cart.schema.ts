import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';

// Mỗi item là một Variant được thêm vào giỏ
@Schema({ _id: false })
export class CartItem {
  @Prop({
    type: Types.ObjectId,
    ref: 'Product',
    required: true,
  })
  productId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
  })
  variantId: Types.ObjectId;

  @Prop({
    type: Number,
    required: true,
    min: 1,
  })
  quantity: number;

  @Prop({
    type: Date,
    default: Date.now,
  })
  addedAt: Date;
}

export const CartItemSchema =
  SchemaFactory.createForClass(CartItem);

export type CartDocument = HydratedDocument<Cart>;

@Schema({
  collection: 'carts',
  timestamps: true,
})
export class Cart {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: [CartItemSchema],
    default: [],
  })
  items: CartItem[];

  createdAt: Date;
  updatedAt: Date;
}

export const CartSchema =
  SchemaFactory.createForClass(Cart);
