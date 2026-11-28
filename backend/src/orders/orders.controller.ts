
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

import { PoliciesGuard } from '../auth/authorization/policies/guards/policies.guard';
import { CheckPolicies } from '../auth/authorization/policies/decorators/check-policies.decorator';

import { Action } from '../auth/authorization/enums/action.enum';
import { Subject } from '../auth/authorization/enums/subject.enum';

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

    // quản lý xem tất cả đơn hàng (admin)
    @Get('manage')
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Read,
        subject: Subject.Order,
    })
    getAllOrders(
        @Req() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException(
                'Vui lòng đăng nhập',
            );
        }
        return this.ordersService.getAllOrders();
    }


// Admin/Employee xem chi tiết đơn hàng
    @Get('manage/:id')
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Read,
        subject: Subject.Order,
    })
    getManagedOrderDetail(
    @Param('id') orderId: string,
    ) {
        return this.ordersService.getManagedOrderDetail(
            orderId,
        );
    }

    //Xem tất cả đơn hàng của mình
    @Get(['', 'me'])
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
            req.user!,
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
            req.user!,
            orderId,
        );
    }

    //thay đổi trạng thái đơn hàng(admin)
    @Patch(':id/status')
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Update,
        subject: Subject.Order,
    })
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

        return this.ordersService.updateOrderStatus(
            orderId,
            dto,
        );
    }

}
