import {
  IsString,
  IsNotEmpty,
  Matches,
  IsEnum,
  IsNumber,
  IsInt,
  IsOptional,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';

import { DiscountType } from './schemas/voucher.schema';

export class CreateVoucherDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9_-]{3,30}$/, {
    message: 'Mã voucher phải có 3-30 ký tự chữ, số, _ hoặc -',
  })
  code: string;

  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsNumber()
  @Min(0.01)
  discountValue: number;

  @IsNumber()
  @Min(0)
  minOrderAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsInt()
  @Min(1)
  usageLimit: number;

  @IsInt()
  @Min(1)
  usageLimitPerUser: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
