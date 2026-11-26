import { Controller, Get,Post,Patch,Delete, Body, Param } from '@nestjs/common';
import { ProductlinesService } from './productlines.service';
import { CreateProductLineDTO } from './create-productline.dto';
import { UpdateProductLineDTO } from './update-productline.dto';

import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../auth/authorization/policies/guards/policies.guard';
import { CheckPolicies } from '../auth/authorization/policies/decorators/check-policies.decorator';

import { Action } from '../auth/authorization/enums/action.enum';
import { Subject } from '../auth/authorization/enums/subject.enum';


@Controller('productlines')
export class ProductlinesController {
    constructor(
        private readonly productLineService : ProductlinesService
    ){}

    //Tạo Dòng Sản phẩm (admin)
    @Post()    
    @UseGuards(JwtAuthGuard, PoliciesGuard    )
    @CheckPolicies      ({
        action: Action.Create,
        subject: Subject.ProductLine,
    })
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
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Update,
        subject: Subject.ProductLine,
    })
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
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Delete,
        subject: Subject.ProductLine,
    })
    remove(@Param('id') id:string){
        return this.productLineService.remove(id);
    }
}
