
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class UpdateReviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment?: string;
}
