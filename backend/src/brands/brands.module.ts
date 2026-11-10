import { Module } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';

import { MongooseModule } from '@nestjs/mongoose';
import { Brand, BrandSchema } from './schemas/brand.schema';
import { Product,ProductSchema } from '../products/schemas/product.schema';

@Module({
  imports:[
    MongooseModule.forFeature([
      {
        name: Brand.name,
        schema: BrandSchema,
      },
      {
        name: Product.name,
        schema: ProductSchema
      },
    ]),
  ],
  providers: [BrandsService],
  controllers: [BrandsController]
})
export class BrandsModule {}
