import { Controller } from '@nestjs/common';
import { Post, Get, Param, Patch, Delete, Body } from '@nestjs/common';

import { BrandsService } from './brands.service';
import { CreateBrandDTO } from './create-brand.dto';
import { UpdateBrandDTO } from './update-brand.dto';

@Controller('brands')
export class BrandsController {
    constructor(
        private readonly brandsService: BrandsService,
    ){}

    //Thêm brand mới (admin)
    @Post()
    create(@Body() createBrandDTO: CreateBrandDTO){
        return this.brandsService.create(createBrandDTO);
    }

    //Lấy tất cả brand
    @Get()
    findAll(){
        return this.brandsService.findAll();
    }

    //Lấy brand theo slug
    @Get('slug/:slug')
    findOne(@Param('slug') slug:string){
        return this.brandsService.findBySlug(slug);
    }

    //Sửa brand theo id(admin)
    @Patch(':id')
    update(
        @Param('id') id:string,
        @Body() updateBrandDTO:UpdateBrandDTO
    ){
        return this.brandsService.update(
            id,
            updateBrandDTO
        );
    }

    //Xoá brand theo id (admin)
    @Delete(':id')
    remove(@Param('id') id:string ){
        return this.brandsService.remove(id);
    }
}
