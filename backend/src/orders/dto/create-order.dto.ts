import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../schemas/order.schema';

export class CustomerInfoDTO {
  @IsNotEmpty({ message: 'Họ và tên người nhận không được để trống' })
  @IsString({ message: 'Họ và tên phải là chuỗi' })
  fullName: string;

  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsString({ message: 'Email phải là chuỗi' })
  email: string;

  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString({ message: 'Số điện thoại phải là chuỗi' })
  phone: string;

  @IsNotEmpty({ message: 'Địa chỉ nhận hàng không được để trống' })
  @IsString({ message: 'Địa chỉ nhận hàng phải là chuỗi' })
  shippingAddress: string;

  @IsOptional()
  @IsString()
  city?: string = '';

  @IsOptional()
  @IsString()
  district?: string = '';

  @IsOptional()
  @IsString()
  note?: string = '';
}

export class DirectOrderItemDTO {
  @IsNotEmpty({ message: 'productId không được để trống' })
  @IsString()
  productId: string;

  @IsNotEmpty({ message: 'sku không được để trống' })
  @IsString()
  sku: string;

  @IsNumber({}, { message: 'quantity phải là số' })
  @Min(1, { message: 'quantity tối thiểu là 1' })
  quantity: number;
}

export class CreateOrderDTO {
  @ValidateNested()
  @Type(() => CustomerInfoDTO)
  @IsNotEmpty({ message: 'Thông tin người nhận không được để trống' })
  customerInfo: CustomerInfoDTO;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedSkus?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DirectOrderItemDTO)
  items?: DirectOrderItemDTO[];

  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán không hợp lệ' })
  paymentMethod?: PaymentMethod = PaymentMethod.COD;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number = 0;

  @IsOptional()
  merchantInfo?: Record<string, unknown>;
}

