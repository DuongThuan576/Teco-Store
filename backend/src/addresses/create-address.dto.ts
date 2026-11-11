
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateAddressDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  receiverName: string;

  @IsString()
  @Matches(/^0[0-9]{9}$/, {
    message: 'Số điện thoại phải có 10 chữ số và bắt đầu bằng 0',
  })
  phone: string;

  @IsString()
  @IsNotEmpty()
  province: string;

  @IsString()
  @IsNotEmpty()
  district: string;

  @IsString()
  @IsNotEmpty()
  ward: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;
}
