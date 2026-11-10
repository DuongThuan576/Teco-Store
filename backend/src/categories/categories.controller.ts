import { Controller, Post, Body, Get, Patch, Delete, Param } from '@nestjs/common';

import { CategoriesService } from './categories.service';
import { CreateCategoryDTO } from './create-category.dto';

import { UpdateCategoryDTO } from './update-category.dto';

@Controller('categories')
export class CategoriesController {
    constructor(
        private readonly categoriesService : CategoriesService,
    ){}

    @Post()
    create(@Body() createCategoryDTO:CreateCategoryDTO){
        return this.categoriesService.create(
            createCategoryDTO,
        );
    }

    @Get()
    findAll(){
        return this.categoriesService.findAll();
    }

    //tìm danh mục theo slug
    @Get('slug/:slug')
    findBySlug(@Param('slug') slug:string){
        return this.categoriesService.findBySlug(slug);
    }

    @Patch(':id')
    update(
        @Param('id') id:string,
        @Body() updateCategoryDTO:UpdateCategoryDTO,
    ){
        return this.categoriesService.update(
            id,
            updateCategoryDTO,
        );
    }

    @Delete(':id')
    remove(@Param('id') id:string){
        return this.categoriesService.remove(id);
    }
}
