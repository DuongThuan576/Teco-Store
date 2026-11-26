import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
} from 'mongoose';

export type VoucherDocument =
  HydratedDocument<Voucher>;

export enum DiscountType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
}

@Schema({
  collection: 'vouchers',
  timestamps: true,
})
export class Voucher {
  @Prop({
    required: true,
    uppercase: true,
    trim: true,
  })
  code: string;

  @Prop({
    type: String,
    enum: Object.values(DiscountType),
    required: true,
  })
  discountType: DiscountType;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  discountValue: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  minOrderAmount: number;

  @Prop({
    type: Number,
    default: null,
    min: 0,
  })
  maxDiscountAmount?: number | null;

  @Prop({
    type: Number,
    required: true,
    min: 1,
  })
  usageLimit: number;

  @Prop({
    type: Number,
    default: 1,
    min: 1,
  })
  usageLimitPerUser: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  usedCount: number;

  @Prop({
    type: Date,
    required: true,
  })
  startDate: Date;

  @Prop({
    type: Date,
    required: true,
  })
  endDate: Date;

  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const VoucherSchema =
  SchemaFactory.createForClass(Voucher);

VoucherSchema.index(
  { code: 1 },
  {
    unique: true,
    name: 'unique_voucher_code',
  },
);
