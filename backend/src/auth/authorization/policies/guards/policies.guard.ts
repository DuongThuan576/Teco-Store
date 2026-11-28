
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import {
  CHECK_POLICIES_KEY,
  RequiredPolicy,
} from '../decorators/check-policies.decorator';

import { AbilityFactory } from '../../ability/ability.factory';

import type {
  AuthenticatedRequest,
} from '../../../guards/jwt-auth.guard';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const policies =
      this.reflector.getAllAndOverride<RequiredPolicy[]>(
        CHECK_POLICIES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    // Fail closed: route dùng Guard nhưng thiếu policy
    if (!policies?.length) {
      throw new ForbiddenException(
        'API chưa được cấu hình chính sách quyền',
      );
    }

    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException(
        'Người dùng chưa được xác thực',
      );
    }

    const ability = this.abilityFactory.createForUser(user);

    const allowed = policies.every((policy) =>
      ability.can(policy.action, policy.subject),
    );

    if (!allowed) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện hành động này',
      );
    }

    return true;
  }
}
