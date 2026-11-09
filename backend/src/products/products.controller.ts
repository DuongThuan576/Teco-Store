import { Body, Controller, Get, Param, ParseIntPipe, Post, Patch, Delete } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDTO } from './create-product.dto';
import { UpdateProductDTO } from './update-product.dto';

@Controller('products')
export class ProductsController {
    constructor(
        private readonly productsService: ProductsService,
    ) { }

    @Get()
    findAll() {
        return this.productsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.productsService.findOne(id);
    }

    @Post()
    create(@Body() createProductDTO: CreateProductDTO) {
        return this.productsService.create(createProductDTO);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateProductDTO: UpdateProductDTO) {
        return this.productsService.update(id, updateProductDTO);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.productsService.remove(id);
    }
}
