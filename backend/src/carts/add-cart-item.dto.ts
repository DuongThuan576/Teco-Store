import {
  IsMongoId,
  IsInt,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';

export class AddCartItemDTO {
  @IsMongoId()
  productId: string;

  @IsOptional()
  @IsMongoId()
  variantId?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
