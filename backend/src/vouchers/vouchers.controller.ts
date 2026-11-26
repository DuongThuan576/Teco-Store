
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

import { PoliciesGuard } from '../auth/authorization/policies/guards/policies.guard';

import { CheckPolicies } from '../auth/authorization/policies/decorators/check-policies.decorator';

import { Action } from '../auth/authorization/enums/action.enum';

import { Subject } from '../auth/authorization/enums/subject.enum';

@Controller('vouchers')
export class VouchersController {
    constructor(
        private readonly vouchersService: VouchersService,
    ) {}

    //tạo voucher mới(admin)
    @Post()
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Create,
        subject: Subject.Voucher,
    })
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

        return this.vouchersService.createVoucher(dto);
    }

    //Lấy tất cả voucher (admin)
    @Get()
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Read,
        subject: Subject.Voucher,
    })
    getAllVouchers(
        @Req() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException(
            'Vui lòng đăng nhập',
            );
        }

        return this.vouchersService.getAllVouchers();
    }


    //Lấy kho voucher (user)
    @Get('my-wallet')
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.ViewWallet,
        subject: Subject.Voucher,
    })
    getMyWallet(
        @Req() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException(
            'Vui lòng đăng nhập',
            );
        }

        return this.vouchersService.getMyWallet(
            user.id,
        );
    }

    //Kieẻm tra voucher (user)
    @Post('validate')
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Validate,
        subject: Subject.Voucher,
    })
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

        return this.vouchersService.validateVoucher(
            user.id,
            dto,
        );
    }


    //lấy chi tiết voucher
    @Get(':id')
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Read,
        subject: Subject.Voucher,
    })
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

        return this.vouchersService.getVoucherDetail(
            voucherId,
        );
    }


    // Sửa voucher(admin)
    @Patch(':id')
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Update,
        subject: Subject.Voucher,
    })
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

        return this.vouchersService.updateVoucher(
            voucherId,
            dto,
        );
    }



}
