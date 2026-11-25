import {
  IsMongoId,
  IsInt,
  Min,
  Max,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class CreateReviewDto {
  @IsMongoId()
  orderId: string;

  @IsMongoId()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment: string;
}
