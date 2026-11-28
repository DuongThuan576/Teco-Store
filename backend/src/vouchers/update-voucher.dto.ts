
import {
  IsOptional,
  IsString,
  Matches,
  IsEnum,
  IsNumber,
  IsInt,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';

import { DiscountType } from './schemas/voucher.schema';

export class UpdateVoucherDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{3,30}$/)
  code?: string;

  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  discountValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimitPerUser?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
