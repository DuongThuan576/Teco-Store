
import {
  Controller,
  Get,
  Req,
  UseGuards,
  UnauthorizedException,
  Body,
  Post,
  Param,
  Patch,
  Delete
} from '@nestjs/common';

import { AddressesService } from './addresses.service';
import {JwtAuthGuard,} from '../auth/guards/jwt-auth.guard';
import type {AuthenticatedRequest} from '../auth/guards/jwt-auth.guard'
import { CreateAddressDTO } from './create-address.dto';
import { UpdateAddressDTO } from './update-address.dto';

@Controller('addresses')
export class AddressesController {
  constructor(
    private readonly addressesService: AddressesService,
  ) {}
  
  //Xem danh sách địa chỉ
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyAddresses(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedException(
        'Không xác định được người dùng',
      );
    }

    return this.addressesService.getMyAddresses(userId);
  }

    // Tạo thêm địa chỉ mới
    @Post()
    @UseGuards(JwtAuthGuard)
    createAddress(
        @Req() req: AuthenticatedRequest,
        @Body() dto: CreateAddressDTO,
        ) {
        const userId = req.user?.id;

        if (!userId) {
            throw new UnauthorizedException(
            'Không xác định được người dùng',
            );
        }

        return this.addressesService.createAddress(
            userId,
            dto,
        );
    }

    //Cập nhật địa chỉ theo id
    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    updateAddress(
        @Req() req: AuthenticatedRequest,
        @Param('id') addressId: string,
        @Body() dto: UpdateAddressDTO,
        ) {
        const userId = req.user?.id;

        if (!userId) {
            throw new UnauthorizedException(
            'Không xác định được người dùng',
            );
        }

        return this.addressesService.updateAddress(
            userId,
            addressId,
            dto,
        );
    }

    //Đặt địa chỉ thành mặc định theo id
    @Patch(':id/default')
    @UseGuards(JwtAuthGuard)
    setDefaultAddress(
        @Req() req: AuthenticatedRequest,
        @Param('id') addressId: string,
        ) {
        const userId = req.user?.id;

        if (!userId) {
            throw new UnauthorizedException(
            'Không xác định được người dùng',
            );
        }

        return this.addressesService.setDefaultAddress(
            userId,
            addressId,
        );
    }

    //Xóa địa chỉ
    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    removeAddress(
        @Req() req: AuthenticatedRequest,
        @Param('id') addressId: string,
        ) {
        const userId = req.user?.id;

        if (!userId) {
            throw new UnauthorizedException(
            'Không xác định được người dùng',
            );
        }

        return this.addressesService.removeAddress(
            userId,
            addressId,
        );
    }

}
