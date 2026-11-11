import {
  IsMongoId,
  IsInt,
  Min,
} from 'class-validator';

export class AddCartItemDTO {
  @IsMongoId()
  productId: string;

  @IsMongoId()
  variantId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
