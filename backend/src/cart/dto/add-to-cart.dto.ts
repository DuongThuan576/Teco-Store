import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddToCartDTO {
  @IsNotEmpty({ message: 'productId không được để trống' })
  @IsString({ message: 'productId phải là chuỗi' })
  productId: string;

  @IsNotEmpty({ message: 'sku không được để trống' })
  @IsString({ message: 'sku phải là chuỗi' })
  sku: string;

  @IsOptional()
  @IsNumber({}, { message: 'quantity phải là số' })
  @Min(1, { message: 'quantity tối thiểu là 1' })
  quantity?: number = 1;
}

