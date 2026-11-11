
import {
  Controller,
  Get,
  Req,
  UseGuards,
  UnauthorizedException,
  Param,
  Patch,
  Body,
} from '@nestjs/common';

import { UsersService } from './users.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDTO } from './update-profile.dto';
import { ChangePasswordDTO } from './change-password.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

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
      userId,
    );
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
            userId,
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
            userId,
            dto,
        );
    }


}
