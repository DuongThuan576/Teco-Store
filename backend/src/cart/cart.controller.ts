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
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDTO } from './dto/add-to-cart.dto';
import { UpdateCartItemDTO } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req: AuthenticatedRequest) {
    const userId = req.user!.id;
    return this.cartService.getCart(userId);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  addItem(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddToCartDTO,
  ) {
    const userId = req.user!.id;
    return this.cartService.addToCart(userId, dto);
  }

  @Patch('items/:sku')
  updateQuantity(
    @Req() req: AuthenticatedRequest,
    @Param('sku') sku: string,
    @Body() dto: UpdateCartItemDTO,
  ) {
    const userId = req.user!.id;
    return this.cartService.updateQuantity(userId, sku, dto.quantity);
  }

  @Delete('items/:sku')
  removeItem(
    @Req() req: AuthenticatedRequest,
    @Param('sku') sku: string,
  ) {
    const userId = req.user!.id;
    return this.cartService.removeItem(userId, sku);
  }

  @Delete()
  clearCart(@Req() req: AuthenticatedRequest) {
    const userId = req.user!.id;
    return this.cartService.clearCart(userId);
  }
}

