import { Controller, Get,Post,Patch,Delete, Body, Param } from '@nestjs/common';
import { ProductlinesService } from './productlines.service';
import { CreateProductLineDTO } from './create-productline.dto';
import { UpdateProductLineDTO } from './update-productline.dto';

@Controller('productlines')
export class ProductlinesController {
    constructor(
        private readonly productLineService : ProductlinesService
    ){}

    //Tạo Dòng Sản phẩm (admin)
    @Post()
    create(@Body() createProductLineDTO:CreateProductLineDTO){
        return this.productLineService.create(
            createProductLineDTO,
        )
    }

    //Lấy tất cả Dòng sản phẩm
    @Get()
    findAll(){
        return this.productLineService.findAll();
    }

    //Lấy dòng sản phẩm theo slug
    @Get('slug/:slug')
    findBySlug(@Param('slug') slug:string){
        return this.productLineService.findBySlug(slug);
    }

    //Cập nhật dòng sản phẩm theo id (admin)
    @Patch(':id')
    update(
        @Param('id') id:string,
        @Body () updateProductLineDTO:UpdateProductLineDTO
    ){
        return this.productLineService.update(
            id,
            updateProductLineDTO,
        );
    }

    @Delete(':id')
    remove(@Param('id') id:string){
        return this.productLineService.remove(id);
    }
}
