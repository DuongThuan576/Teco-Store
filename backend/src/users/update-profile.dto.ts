import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDTO {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(/^(0[0-9]{9})?$/, {
    message:
      'Số điện thoại phải có 10 chữ số bắt đầu bằng 0 hoặc để trống',
  })
  phone?: string;
}
