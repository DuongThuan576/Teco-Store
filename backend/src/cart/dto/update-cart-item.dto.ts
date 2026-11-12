import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UpdateCartItemDTO {
  @IsNotEmpty({ message: 'quantity không được để trống' })
  @IsNumber({}, { message: 'quantity phải là số' })
  @Min(1, { message: 'quantity tối thiểu là 1' })
  quantity: number;
}

