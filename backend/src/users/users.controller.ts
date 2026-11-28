
import {
  Query,
  ParseIntPipe,
  Controller,
  Get,
  Req,
  UseGuards,
  UnauthorizedException,
  Param,
  Patch,
  Body,
  BadRequestException,
} from '@nestjs/common';

import { UsersService } from './users.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDTO } from './update-profile.dto';
import { ChangePasswordDTO } from './change-password.dto';
import { UpdateUserStatusDto } from './update-user-status.dto';
import { UpdateUserRoleDto } from './update-user-role.dto';

import { PoliciesGuard } from '../auth/authorization/policies/guards/policies.guard';
import { CheckPolicies } from '../auth/authorization/policies/decorators/check-policies.decorator';
import { Action } from '../auth/authorization/enums/action.enum';
import { Subject } from '../auth/authorization/enums/subject.enum';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
   ) {}

  //Admin Lấy danh sách user
  @Get()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies({
    action: Action.Read,
    subject: Subject.UserManagement,
  })
  getAllUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    if (
      page < 1 ||
      limit < 1 ||
      limit > 50
    ) {
      throw new BadRequestException(
        'page phải >= 1 và limit phải từ 1 đến 50',
      );
    }

    return this.usersService.getAllUsers(page, limit);
  }

  // Lấy thông tin cá nhân
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyProfile(
    @Req() req: AuthenticatedRequest,
  ) {
    // 1. Lấy User ID từ JWT
    const userId = req.user?.id;

    // 2. Kiểm tra User ID
    if (!userId) {
      throw new UnauthorizedException(
        'Không xác định được người dùng',
      );
    }

    // 3. Gọi Service
    return this.usersService.getMyProfile(
      req.user!,
    );
  }


  // Admin xem chi tiết tài khoản
  @Get(':id')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies({
    action: Action.Read,
    subject: Subject.UserManagement,
  })
  getUserDetail(
    @Param('id') userId: string,
  ) {
    return this.usersService.getUserDetail(userId);
  }


    //Cập nhật thông tin cá nhân
    @Patch('me')
    @UseGuards(JwtAuthGuard)
    updateMyProfile(
        @Req() req: AuthenticatedRequest,
        @Body() dto: UpdateProfileDTO,
        ) {
        // 1. Lấy User ID đã xác thực
        const userId = req.user?.id;

        if (!userId) {
            throw new UnauthorizedException(
            'Không xác định được người dùng',
            );
        }

        // 2. Gọi Service để cập nhật
        return this.usersService.updateMyProfile(
            req.user!,
            dto,
        );
    }

    //Thay đổi mật khẩu
  @Patch('me/change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDTO,
  ) {
    const userId = req.user?.id;

    if (!userId) {
        throw new UnauthorizedException(
          'Không xác định được người dùng',
        );
    }

    return this.usersService.changePassword(
        req.user!,
        dto,
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies({
    action: Action.Update,
    subject: Subject.UserManagement,
  })
  updateUserStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(
      req.user!.id,
      userId,
      dto,
    );
  }


  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies({
    action: Action.Update,
    subject: Subject.UserManagement,
  })
  updateUserRole(
    @Req() req: AuthenticatedRequest,
    @Param('id') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateUserRole(
      req.user!.id,
      userId,
      dto,
    );
  }



}
