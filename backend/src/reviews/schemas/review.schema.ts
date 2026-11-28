
import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({
  collection: 'reviews',
  timestamps: true,
})
export class Review {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Product',
    required: true,
  })
  productId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Order',
    default: null,
  })
  orderId?: Types.ObjectId | null;

  @Prop({
    type: Number,
    min: 1,
    max: 5,
    default: null,
  })
  rating?: number | null;

  @Prop({
    type: String,
    trim: true,
    maxlength: 1000,
    required: true,
  })
  comment: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Review',
    default: null,
  })
  parentId?: Types.ObjectId | null;

  @Prop({
    type: Boolean,
    default: false,
  })
  isHidden: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const ReviewSchema =
  SchemaFactory.createForClass(Review);

// Mỗi Customer chỉ đánh giá một Product
// một lần trong cùng Order.
ReviewSchema.index(
  {
    userId: 1,
    orderId: 1,
    productId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      orderId: { $type: 'objectId' },
      parentId: null,
    },
    name: 'unique_review_per_order_product',
  },
);


ReviewSchema.index(
  { parentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      parentId: { $type: 'objectId' },
    },
    name: 'unique_shop_reply_per_review',
  },
);

