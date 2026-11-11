import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';

import {
  Cart,
  CartSchema,
} from './schemas/cart.schema';

import {
  Product,
  ProductSchema,
} from '../products/schemas/product.schema';

import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';

@Module({
  imports: [
    AuthModule,

    MongooseModule.forFeature([
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

  controllers: [CartsController],

  providers: [
    CartsService,
  ],
})
export class CartsModule {}
