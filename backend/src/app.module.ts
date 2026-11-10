import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { MongooseModule } from '@nestjs/mongoose';

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
  ],

  controllers: [AppController],
  providers: [AppService],

})

export class AppModule { }
