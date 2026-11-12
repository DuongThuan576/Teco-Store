import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDTO } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { OrderStatus, PaymentStatus } from './schemas/order.schema';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createOrder(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateOrderDTO,
  ) {
    const userId = req.user!.id;
    return this.ordersService.createOrder(userId, dto);
  }

  @Get()
  getUserOrders(
    @Req() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const userId = req.user!.id;
    return this.ordersService.getUserOrders(userId, page, limit);
  }

  // --- Admin Routes ---
  @Get('admin/all')
  getAllOrdersAdmin(
    @Req() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const userRole = req.user!.role;
    return this.ordersService.getAllOrdersAdmin(userRole, page, limit, status, search);
  }

  @Patch('admin/:idOrCode/status')
  updateOrderStatusAdmin(
    @Req() req: AuthenticatedRequest,
    @Param('idOrCode') idOrCode: string,
    @Body('status') newStatus: OrderStatus,
  ) {
    const userRole = req.user!.role;
    return this.ordersService.updateOrderStatusAdmin(userRole, idOrCode, newStatus);
  }

  @Patch('admin/:idOrCode/payment')
  updatePaymentStatusAdmin(
    @Req() req: AuthenticatedRequest,
    @Param('idOrCode') idOrCode: string,
    @Body('paymentStatus') paymentStatus: PaymentStatus,
  ) {
    const userRole = req.user!.role;
    return this.ordersService.updatePaymentStatusAdmin(userRole, idOrCode, paymentStatus);
  }

  // --- Customer / Shared Routes ---
  @Get(':idOrCode')
  getOrderDetail(
    @Req() req: AuthenticatedRequest,
    @Param('idOrCode') idOrCode: string,
  ) {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    return this.ordersService.getOrderDetail(userId, userRole, idOrCode);
  }

  @Patch(':idOrCode/cancel')
  cancelOrder(
    @Req() req: AuthenticatedRequest,
    @Param('idOrCode') idOrCode: string,
  ) {
    const userId = req.user!.id;
    return this.ordersService.cancelOrder(userId, idOrCode);
  }
}

