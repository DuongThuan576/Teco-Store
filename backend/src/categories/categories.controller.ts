import { Controller, Post, Body, Get, Patch, Delete, Param } from '@nestjs/common';

import { CategoriesService } from './categories.service';
import { CreateCategoryDTO } from './create-category.dto';

import { UpdateCategoryDTO } from './update-category.dto';
import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../auth/authorization/policies/guards/policies.guard';
import { CheckPolicies } from '../auth/authorization/policies/decorators/check-policies.decorator';

import { Action } from '../auth/authorization/enums/action.enum';
import { Subject } from '../auth/authorization/enums/subject.enum';

@Controller('categories')
export class CategoriesController {
    constructor(
        private readonly categoriesService : CategoriesService,
    ){}

    //Tạo Danh mục mới (admin)
    @Post()
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Create,
        subject: Subject.Category,
    })
    create(@Body() createCategoryDTO:CreateCategoryDTO){
        return this.categoriesService.create(
            createCategoryDTO,
        );
    }

    //Lấy tất cả danh mục
    @Get()
    findAll(){
        return this.categoriesService.findAll();
    }

    //tìm danh mục theo slug
    @Get('slug/:slug')
    findBySlug(@Param('slug') slug:string){
        return this.categoriesService.findBySlug(slug);
    }

    //Sửa danh mục theo id (admin)
    @Patch(':id')
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Update,
        subject: Subject.Category,
    })
    update(
        @Param('id') id:string,
        @Body() updateCategoryDTO:UpdateCategoryDTO,
    ){
        return this.categoriesService.update(
            id,
            updateCategoryDTO,
        );
    }

    //Xóa danh mục theo id(admin)
    @Delete(':id')
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Delete,
        subject: Subject.Category,
    })
    remove(@Param('id') id:string){
        return this.categoriesService.remove(id);
    }
}
