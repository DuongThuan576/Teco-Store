import { Controller } from '@nestjs/common';
import { Post, Get, Param, Patch, Delete, Body } from '@nestjs/common';

import { BrandsService } from './brands.service';
import { CreateBrandDTO } from './create-brand.dto';
import { UpdateBrandDTO } from './update-brand.dto';
import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../auth/authorization/policies/guards/policies.guard';
import { CheckPolicies } from '../auth/authorization/policies/decorators/check-policies.decorator';

import { Action } from '../auth/authorization/enums/action.enum';
import { Subject } from '../auth/authorization/enums/subject.enum';

@Controller('brands')
export class BrandsController {
    constructor(
        private readonly brandsService: BrandsService,
    ){}

    //Thêm brand mới (admin)
    @Post()
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Create,
        subject: Subject.Brand,
    })
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
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Update,
        subject: Subject.Brand,
    })
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
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Delete,
        subject: Subject.Brand,
    })
    remove(@Param('id') id:string ){
        return this.brandsService.remove(id);
    }
}
