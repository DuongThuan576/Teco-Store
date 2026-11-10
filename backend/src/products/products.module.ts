import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

import { Product, ProductSchema } from './schemas/product.schema';
import { Brand, BrandSchema,} from '../brands/schemas/brand.schema';
import { Category, CategorySchema,} from '../categories/schemas/category.schema';
import { ProductLine, ProductLineSchema,} from '../productlines/schemas/productline.schema';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Brand.name, schema: BrandSchema },
      { name: Category.name, schema: CategorySchema },
      {
        name: ProductLine.name,
        schema: ProductLineSchema,
      },
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService]
})
export class ProductsModule { }
