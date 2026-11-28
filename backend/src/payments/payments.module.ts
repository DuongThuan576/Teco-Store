
import { Module } from '@nestjs/common';
import {
  MongooseModule,
} from '@nestjs/mongoose';

import {
  Payment,
  PaymentSchema,
} from './schemas/payment.schema';

import {
  PaymentsService,
} from './payments.service';

import {
  PaymentsController,
} from './payments.controller';

import {
  Order,
  OrderSchema,
} from '../orders/schemas/order.schema';

import { AuthModule } from '../auth/auth.module';

import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    AuthModule,
    OrdersModule,
    MongooseModule.forFeature([
      {
        name: Payment.name,
        schema: PaymentSchema,
      },
      {
        name: Order.name,
        schema: OrderSchema,
      }
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})

export class PaymentsModule { }
