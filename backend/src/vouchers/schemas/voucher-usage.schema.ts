import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
  Schema as MongooseSchema
} from 'mongoose';

export type VoucherUsageDocument =
  HydratedDocument<VoucherUsage>;

export enum VoucherUsageStatus {
  USED = 'used',
  REVERSED = 'reversed',
}

@Schema({
  collection: 'voucherUsages',
  timestamps: true,
})
export class VoucherUsage {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Voucher',
    required: true,
  })
  voucherId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Order',
    required: true,
  })
  orderId: Types.ObjectId;

  @Prop({
    type: Number,
    required: true,
    min: 0.01,
  })
  discountAmount: number;

  @Prop({
    type: String,
    enum: Object.values(VoucherUsageStatus),
    default: VoucherUsageStatus.USED,
  })
  status: VoucherUsageStatus;

  @Prop({
    type: Date,
    default: Date.now,
  })
  usedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const VoucherUsageSchema =
  SchemaFactory.createForClass(VoucherUsage);

VoucherUsageSchema.index(
  { orderId: 1 },
  {
    unique: true,
    name: 'unique_voucher_usage_per_order',
  },
);

VoucherUsageSchema.index({
  voucherId: 1,
  userId: 1,
  status: 1,
});
