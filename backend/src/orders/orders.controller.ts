
import {
    Get,
    Param,
    Body,
    Controller,
    Post,
    Req,
    UnauthorizedException,
    ForbiddenException,
    UseGuards,
    Patch,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './create-order.dto';
import { UpdateOrderStatusDto } from './update-order-status.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';

import { UserRole } from '../auth/user-role.enum';

@Controller('orders')
export class OrdersController {
    constructor(
        private readonly ordersService: OrdersService,
    ) {}

    //Đặt hàng
    @Post()
    @UseGuards(JwtAuthGuard)
    createOrder(
        @Req() req: AuthenticatedRequest,
        @Body() dto: CreateOrderDto,
    ) {
        if (!req.user) {
            throw new UnauthorizedException();
        }

        // Tạm kiểm tra role trực tiếp.
        // Sau này sẽ thay bằng PBAC.
        if (req.user.role !== UserRole.CUSTOMER) {
            throw new ForbiddenException(
                'Chỉ Customer được thực hiện Checkout',
            );
        }

        return this.ordersService.createOrder(
            req.user.id,
            dto,
        );
    }

    //Xem tất cả đơn hàng của mình
    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMyOrders(
        @Req() req:AuthenticatedRequest,
    ){
        const userId = req.user?.id;

        if (!userId){
            throw new UnauthorizedException(
                'Không xác định được người dùng'
            );
        }

        return this.ordersService.getMyOrders(userId)
    }


    //xem chi tiết đơn hàng đã đặt
    @Get(':id')
    @UseGuards(JwtAuthGuard)
    getOrderDetail(
        @Req() req: AuthenticatedRequest,
        @Param('id') orderId: string,
    ) {
        const userId = req.user?.id;

        if (!userId) {
            throw new UnauthorizedException(
                'Không xác định được người dùng',
            );
        }

        return this.ordersService.getOrderDetail(
            userId,
            orderId,
        );
    }

    //hủy đơn hàng (user)
    @Patch(':id/cancel')
    @UseGuards(JwtAuthGuard)
    cancelOrder(
        @Req() req: AuthenticatedRequest,
        @Param('id') orderId: string,
    ) {
        const userId = req.user?.id;

        if (!userId) {
            throw new UnauthorizedException(
                'Không xác định được người dùng',
            );
        }

        return this.ordersService.cancelOrder(
            userId,
            orderId,
        );
    }

    //thay đổi trạng thái đơn hàng(admin)
    @Patch(':id/status')
    @UseGuards(JwtAuthGuard)
    updateOrderStatus(
        @Req() req: AuthenticatedRequest,
        @Param('id') orderId: string,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException(
                'Vui lòng đăng nhập',
            );
        }

        const allowedRoles = ['admin', 'employee'];

        if (!allowedRoles.includes(user.role)) {
            throw new ForbiddenException(
                'Bạn không có quyền cập nhật trạng thái đơn hàng',
            );
        }

        return this.ordersService.updateOrderStatus(
            orderId,
            dto,
        );
    }

    // quản lý xem tất cả đơn hàng (admin)
    @Get('manage')
    @UseGuards(JwtAuthGuard)
    getAllOrders(
        @Req() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException(
                'Vui lòng đăng nhập',
            );
        }

        const allowedRoles = ['admin', 'employee'];

        if (!allowedRoles.includes(user.role)) {
            throw new ForbiddenException(
                'Bạn không có quyền xem danh sách đơn hàng',
            );
        }

        return this.ordersService.getAllOrders();
    }

}
