import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';

export type AddressDocument =
  HydratedDocument<Address>;

@Schema({
  collection: 'addresses',
  timestamps: true,
})
export class Address {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  receiverName: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true, trim: true })
  province: string;

  @Prop({ required: true, trim: true })
  district: string;

  @Prop({ required: true, trim: true })
  ward: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDefault: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const AddressSchema =
  SchemaFactory.createForClass(Address);

// Mỗi User có tối đa một địa chỉ mặc định
AddressSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDefault: true,
    },
    name: 'unique_default_address_per_user',
  },
);
