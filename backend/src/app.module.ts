import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { ProductlinesModule } from './productlines/productlines.module';
import { AuthModule } from './auth/auth.module';
import { CartsModule } from './carts/carts.module';
import { AddressesModule } from './addresses/addresses.module';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (ConfigService: ConfigService) => ({
        uri: ConfigService.getOrThrow<string>('MONGODB_URI'),
        dbName: ConfigService.getOrThrow<string>('MONGODB_DATABASE'),
        autoIndex:true,
      }),
    }),

    ProductsModule,

    CategoriesModule,

    BrandsModule,

    ProductlinesModule,

    AuthModule,

    CartsModule,

    AddressesModule,

    UsersModule,

    OrdersModule,
  ],

  controllers: [AppController],
  providers: [AppService],

})

export class AppModule { }
