import { Module } from '@nestjs/common';
import { ProductlinesService } from './productlines.service';
import { ProductlinesController } from './productlines.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductLineSchema, ProductLine } from './schemas/productline.schema';

import { Brand,BrandSchema } from '../brands/schemas/brand.schema';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';

@Module({
  imports:[
    MongooseModule.forFeature([
      {
        name:ProductLine.name,
        schema:ProductLineSchema
      },
      {
        name:Brand.name,
        schema:BrandSchema,
      },
      {
        name:Category.name,
        schema:CategorySchema,
      },
      {
        name:Product.name,
        schema:ProductSchema
      },
    ])
  ],
  providers: [ProductlinesService],
  controllers: [ProductlinesController]
})
export class ProductlinesModule {}
