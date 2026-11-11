import {
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class ChangePasswordDTO {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8, {
    message: 'Mật khẩu mới phải có ít nhất 8 ký tự',
  })
  @MaxLength(128)
  newPassword: string;
}
