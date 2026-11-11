
import {
  IsInt,
  Min,
} from 'class-validator';

export class UpdateCartItemDTO {
  @IsInt()
  @Min(1)
  quantity: number;
}
