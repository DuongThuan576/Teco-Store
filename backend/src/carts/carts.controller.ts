import {
    Controller,
    Get,
    Req,
    UseGuards,
    UnauthorizedException,
    Body,
    Post,
    Patch,
    Param,
    Delete,
} from '@nestjs/common';

import type { Request } from 'express';

import { CartsService } from './carts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddCartItemDTO } from './add-cart-item.dto';
import { UpdateCartItemDTO } from './update-cart-item.dto';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
  };
};

@Controller('carts')
export class CartsController {
  constructor(
    private readonly cartsService: CartsService,
  ) {}

  //Lấy giỏ hàng của người dùng
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyCart(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedException(
        'Không xác định được người dùng',
      );
    }

    return this.cartsService.getMyCart(userId);
  }

    //Thêm items vào giỏ hàng
    @Post('items')
    @UseGuards(JwtAuthGuard)
    addItem(
        @Req() req: AuthenticatedRequest,
        @Body() dto: AddCartItemDTO,
        ) {
        const userId = req.user?.id;

        if (!userId) {
            throw new UnauthorizedException(
            'Không xác định được người dùng',
            );
        }

        return this.cartsService.addItem(userId, dto);
    }
    //Cập nhật item trong giỏ hàng 
    @Patch('items/:variantId')
    @UseGuards(JwtAuthGuard)
    updateItem(
        @Req() req: AuthenticatedRequest,
        @Param('variantId') variantId: string,
        @Body() dto: UpdateCartItemDTO,
        ) {
        const userId = req.user?.id;

        if (!userId) {
            throw new UnauthorizedException(
            'Không xác định được người dùng',
            );
        }

        return this.cartsService.updateItem(
            userId,
            variantId,
            dto,
        );
    }

    //Xóa Item trong giỏ hàng
    @Delete('items/:variantId')
    @UseGuards(JwtAuthGuard)
    removeItem(
        @Req() req: AuthenticatedRequest,
        @Param('variantId') variantId: string,
        ) {
        const userId = req.user?.id;

        if (!userId) {
            throw new UnauthorizedException(
            'Không xác định được người dùng',
            );
        }

        return this.cartsService.removeItem(
            userId,
            variantId,
        );
    }

    //Xóa tất cả item trong giỏ hàng
    @Delete('me')
    @UseGuards(JwtAuthGuard)
    clearCart(
        @Req() req: AuthenticatedRequest,
        ) {
        const userId = req.user?.id;

        if (!userId) {
            throw new UnauthorizedException(
            'Không xác định được người dùng',
            );
        }

        return this.cartsService.clearCart(userId);
    }


}
