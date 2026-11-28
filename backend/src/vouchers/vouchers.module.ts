import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
    Voucher,
    VoucherSchema,
} from './schemas/voucher.schema';

import {
  VoucherUsage,
  VoucherUsageSchema,
} from './schemas/voucher-usage.schema';

import { AuthModule } from '../auth/auth.module';

import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { Cart, CartSchema } from '../carts/schemas/cart.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';


@Module({
    imports: [
      AuthModule,
      MongooseModule.forFeature([
        {
          name: Voucher.name,
          schema: VoucherSchema,
        },
        {
          name: VoucherUsage.name,
          schema: VoucherUsageSchema,
        },
        {
          name: Cart.name,
          schema: CartSchema,
        },
        {
          name: Product.name,
          schema: ProductSchema,
        },
      ]),
    ],
    controllers: [VouchersController],
    providers: [VouchersService],
    exports: [VouchersService],
})

export class VouchersModule {}
