import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDTO } from './dto/add-to-cart.dto';
import { UpdateCartItemDTO } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';

@Controller(['cart', 'carts'])
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Thiếu thông tin người dùng xác thực');
    }
    return this.cartService.getCart(userId);
  }

  @Get('me')
  getMyCart(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Thiếu thông tin người dùng xác thực');
    }
    return this.cartService.getCart(userId);
  }

  @Get('items')
  getCartItems(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Thiếu thông tin người dùng xác thực');
    }
    return this.cartService.getCart(userId);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  addItem(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddToCartDTO,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Thiếu thông tin người dùng xác thực');
    }
    return this.cartService.addToCart(userId, dto);
  }

  @Patch('items/:idOrSku')
  updateQuantity(
    @Req() req: AuthenticatedRequest,
    @Param('idOrSku') idOrSku: string,
    @Body() dto: UpdateCartItemDTO,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Thiếu thông tin người dùng xác thực');
    }
    return this.cartService.updateQuantity(userId, idOrSku, dto.quantity);
  }

  @Delete('items/:idOrSku')
  removeItem(
    @Req() req: AuthenticatedRequest,
    @Param('idOrSku') idOrSku: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Thiếu thông tin người dùng xác thực');
    }
    return this.cartService.removeItem(userId, idOrSku);
  }

  @Delete()
  clearCart(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Thiếu thông tin người dùng xác thực');
    }
    return this.cartService.clearCart(userId);
  }

  @Delete('me')
  clearCartMe(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Thiếu thông tin người dùng xác thực');
    }
    return this.cartService.clearCart(userId);
  }
}
