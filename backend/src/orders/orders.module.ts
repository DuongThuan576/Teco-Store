import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Order, OrderSchema } from './schemas/order.schema';
import { Cart, CartSchema } from '../carts/schemas/cart.schema';
import { Address, AddressSchema } from '../addresses/schemas/address.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { AuthModule } from '../auth/auth.module';

import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
    imports: [
        VouchersModule,
        AuthModule,
        MongooseModule.forFeature([
            {
                name: Order.name,
                schema: OrderSchema
            },
            {
                name: Cart.name,
                schema: CartSchema
            },
            {
                name: Address.name,
                schema:AddressSchema
            },
            {
                name: Product.name,
                schema: ProductSchema
            },
        ])
    ],
    controllers: [OrdersController],
    providers: [OrdersService]
})
export class OrdersModule { }
