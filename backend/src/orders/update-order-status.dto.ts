
import { IsIn } from 'class-validator';

export const STAFF_ORDER_STATUSES = [
  'da_xac_nhan',
  'dang_giao',
  'da_giao',
] as const;

export type StaffOrderStatus =
  (typeof STAFF_ORDER_STATUSES)[number];

export class UpdateOrderStatusDto {
  @IsIn(STAFF_ORDER_STATUSES, {
    message: 'Trạng thái đơn hàng không hợp lệ',
  })
  status: StaffOrderStatus;
}
