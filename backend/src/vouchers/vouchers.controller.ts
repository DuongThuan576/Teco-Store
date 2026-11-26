
import {
    Get,
    Param,
    Patch,
    Controller,
    Post,
    Body,
    Req,
    UseGuards,
    UnauthorizedException,
    ForbiddenException,
} from '@nestjs/common';

import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './create-voucher.dto';
import { UpdateVoucherDto } from './update-voucher.dto';
import { ValidateVoucherDto } from './validate-voucher.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import type {
  AuthenticatedRequest,
} from '../auth/guards/jwt-auth.guard';

@Controller('vouchers')
export class VouchersController {
    constructor(
        private readonly vouchersService: VouchersService,
    ) {}

    //tạo voucher mới(admin)
    @Post()
    @UseGuards(JwtAuthGuard)
    createVoucher(
        @Req() req: AuthenticatedRequest,
        @Body() dto: CreateVoucherDto,
    ) {
        const user = req.user;

        if (!user) {
        throw new UnauthorizedException(
            'Vui lòng đăng nhập',
        );
        }

        // Tạm kiểm tra Role trước khi triển khai PBAC
        if (user.role !== 'admin') {
        throw new ForbiddenException(
            'Chỉ Admin được tạo voucher',
        );
        }

        return this.vouchersService.createVoucher(dto);
    }

    //Lấy tất cả voucher (admin)
    @Get()
    @UseGuards(JwtAuthGuard)
        getAllVouchers(
    @Req() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException(
            'Vui lòng đăng nhập',
            );
        }

        if (user.role !== 'admin') {
            throw new ForbiddenException(
            'Chỉ Admin được xem danh sách voucher',
            );
        }

        return this.vouchersService.getAllVouchers();
    }


    //Lấy kho voucher (user)
    @Get('my-wallet')
    @UseGuards(JwtAuthGuard)
    getMyWallet(
        @Req() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException(
            'Vui lòng đăng nhập',
            );
        }

        if (user.role !== 'customer') {
            throw new ForbiddenException(
            'Chỉ Customer được xem kho voucher của mình',
            );
        }

        return this.vouchersService.getMyWallet(
            user.id,
        );
    }

    //Kieẻm tra voucher (user)
    @Post('validate')
    @UseGuards(JwtAuthGuard)
    validateVoucher(
        @Req() req: AuthenticatedRequest,
        @Body() dto: ValidateVoucherDto,
    ) {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException(
                'Vui lòng đăng nhập',
            );
        }

        if (user.role !== 'customer') {
            throw new ForbiddenException(
                'Chỉ Customer được kiểm tra voucher',
            );
        }

        return this.vouchersService.validateVoucher(
            user.id,
            dto,
        );
    }


    //lấy chi tiết voucher
    @Get(':id')
    @UseGuards(JwtAuthGuard)
    getVoucherDetail(
        @Req() req: AuthenticatedRequest,
        @Param('id') voucherId: string,
    ) {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException(
            'Vui lòng đăng nhập',
            );
        }

        if (user.role !== 'admin') {
            throw new ForbiddenException(
            'Chỉ Admin được xem chi tiết voucher',
            );
        }

        return this.vouchersService.getVoucherDetail(
            voucherId,
        );
    }


    // Sửa voucher(admin)
    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    updateVoucher(
        @Req() req: AuthenticatedRequest,
        @Param('id') voucherId: string,
        @Body() dto: UpdateVoucherDto,
    ) {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException(
                'Vui lòng đăng nhập',
            );
        }

        if (user.role !== 'admin') {
            throw new ForbiddenException(
                'Chỉ Admin được cập nhật Voucher',
            );
        }

        return this.vouchersService.updateVoucher(
            voucherId,
            dto,
        );
    }



}
