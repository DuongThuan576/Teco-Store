import { Body, Controller, Get, Param, BadRequestException, Post, Patch, Delete } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDTO } from './create-product.dto';
import { UpdateProductDTO } from './update-product.dto';
import { VariantDTO } from './variant.dto';
import { UpdateVariantDTO } from './update-variant.dto';

@Controller('products')
export class ProductsController {
    constructor(
        private readonly productsService: ProductsService,
    ) { }

    @Get()
    findAll() {
        return this.productsService.findAll();
    }

    //Tìm tất cả các variants của sp (admin)
    @Get(':productId/variants')
    findVariants(@Param('productId') productId: string) {
        return this.productsService.findVariants(productId);
    }

    // tìm theo slug (customer)
    @Get('slug/:slug')
    findBySlug(@Param('slug') slug: string) {
        return this.productsService.findBySlug(slug);
    }

    // tìm theo slug/sku (customer)
    @Get('slug/:slug/variants/:sku')
    findVariantBySku(
    @Param('slug') slug: string,
    @Param('sku') sku: string,
    ) {
    return this.productsService.findVariantBySku(
        slug,
        sku,
    );
    }

    // tìm theo id (admin)
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    //Tìm variant theo id (admin)
    @Get(':productId/variants/:variantId')
    findVariantById(
        @Param('productId') productId: string,
        @Param('variantId') variantId: string,
        ) {
        return this.productsService.findVariantById(
            productId,
            variantId,
    );
}

    @Post()
    create(@Body() createProductDTO: CreateProductDTO) {
        return this.productsService.create(createProductDTO);
    }

    @Post(':productId/variants')
    addVariant(
        @Param('productId') productId: string,
        @Body() variantDTO: VariantDTO,
        ) {
        return this.productsService.addVariant(
            productId,
            variantDTO,
        );
    }

    //update product (admin)
    @Patch(':id') 
    update(
        @Param('id') id: string,
        @Body() updateProductDTO: UpdateProductDTO) {
        return this.productsService.update(id, updateProductDTO);
    }

    //route sửa variant( admin)
    @Patch(':productId/variants/:variantId')
    updateVariant(
        @Param('productId') productId: string,
        @Param('variantId') variantId: string,
        @Body() updateVariantDTO: UpdateVariantDTO
    ){
        return this.productsService.updateVariant(
            productId,
            variantId,
            updateVariantDTO,
        );
    }

    // route xóa variant (admin)
    @Delete(':productId/variants/:variantId')
    removeVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    ) {
    return this.productsService.removeVariant(
        productId,
        variantId,
    );
    }

    // xóa product (admin)
    @Delete(':id') 
    remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }

}
