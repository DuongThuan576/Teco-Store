import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  Schema as MongooseSchema,
  Types,
} from 'mongoose';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Schema({
  collection: 'payments',
  timestamps: true,
})
export class Payment {
    _id: Types.ObjectId;

    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: 'Order',
        required: true,
    })
    orderId: Types.ObjectId;

    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: 'User',
        required: true,
    })
    userId: Types.ObjectId;

    @Prop({
        type: String,
        enum: ['vnpay'],
        required: true,
    })
    provider: string;

    @Prop({
        type: String,
        required: true,
        unique: true,
    })
    transactionCode: string;

    @Prop({
        type: Number,
        required: true,
        min: 0,
    })
    amount: number;

    @Prop({
        type: String,
        default: 'VND',
    })
    currency: string;

    @Prop({
        type: String,
        enum: Object.values(PaymentStatus),
        default: PaymentStatus.PENDING,
    })
    status: PaymentStatus;

    @Prop({ type: String, default: null })
    vnpResponseCode: string | null;

    @Prop({ type: String, default: null })
    vnpTransactionStatus: string | null;

    @Prop({ type: String, default: null })
    providerTransactionId: string | null;

    @Prop({ type: Date, default: null })
    paidAt: Date | null;

    createdAt: Date;
    updatedAt: Date;
}

export const PaymentSchema =
  SchemaFactory.createForClass(Payment);

PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ userId: 1, createdAt: -1 });
