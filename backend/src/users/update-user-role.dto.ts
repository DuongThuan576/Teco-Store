import { IsIn } from 'class-validator';
import { UserRole } from '../auth/user-role.enum';

export class UpdateUserRoleDto {
  @IsIn([UserRole.CUSTOMER, UserRole.EMPLOYEE])
  role: UserRole.CUSTOMER | UserRole.EMPLOYEE;
}
