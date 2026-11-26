
import {
    Param,
    Get,
    Body,
    Controller,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { PaymentsService } from './payments.service';
import { CreatePaymentUrlDto } from './create-payment-url.dto';

// Điều chỉnh đường dẫn theo Auth Module thực tế
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
  };
};

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post('vnpay/create-url')
  @UseGuards(JwtAuthGuard)
  async createVnpayUrl(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePaymentUrlDto,
  ) {
    // Chuẩn hóa địa chỉ IP localhost
    let ipAddress = req.ip || '127.0.0.1';

    if (ipAddress === '::1') {
      ipAddress = '127.0.0.1';
    } else if (ipAddress.startsWith('::ffff:')) {
      ipAddress = ipAddress.slice(7);
    }

    return this.paymentsService.createPaymentUrl(
      req.user.id,
      dto.orderId,
      ipAddress,
    );
  }


    @Get('vnpay/return')
    async vnpayReturn(@Req() req: Request) {
        return this.paymentsService.handleVnpayReturn(
            req.query as Record<string, unknown>,
        );
    }


    @Get('vnpay/ipn')
    async vnpayIpn(@Req() req: Request) {
        return this.paymentsService.handleVnpayIpn(
            req.query as Record<string, unknown>,
        );
    }

}
