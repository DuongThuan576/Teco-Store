import { Injectable, ConflictException, BadRequestException, NotFoundException  } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoServerError } from 'mongodb';

import { Brand } from './schemas/brand.schema';
import { CreateBrandDTO } from './create-brand.dto';
import { UpdateBrandDTO } from './update-brand.dto';
import { isValidObjectId } from 'mongoose';

import { Product } from '../products/schemas/product.schema';

@Injectable()
export class BrandsService {
    constructor(
        @InjectModel(Brand.name)
        private readonly brandModel: Model<Brand>,
        @InjectModel(Product.name)
        private readonly productModel: Model<Product>,
    ){}
    
    async create(createBrandDTO:CreateBrandDTO){
        //kiem tra slug ton tai hay chua
        const existingSlug = await this.brandModel.findOne({slug: createBrandDTO.slug}).exec()

        if(existingSlug){
            throw new ConflictException(
                `slug thương hiệu đã tồn tại`,
            );
        }

        //tao brand moi
        const newBrand = new this.brandModel(createBrandDTO,);

        //Lưu dữ liệu vào mongo
        try {
            return await newBrand.save();
        }catch (error){
            if (error instanceof MongoServerError && error.code === 11000){
                throw new ConflictException(
                    'slug thương hiệu đã tồn tại trên Mongo',
                );
            }
            throw error;
        }
    }

    async findAll(){
        return await this.brandModel.find().exec();
    };

    //Tìm brand theo slug
    async findBySlug (slug:string){
        const brand = await this.brandModel.findOne({slug}).exec()

        if (!brand){
            throw new NotFoundException(
                `Không tìm thấy thương hiệu với slug: ${slug}`
            );
        }
        return brand;
    }

    // sửa brand
    async update(id:string, updateBrandDTO:UpdateBrandDTO){
        if (!isValidObjectId(id)){
            throw new BadRequestException(
                'Brand ID không hợp lệ'
            );
        }

        //Kiem tra brand ton tai
        const brand = await this.brandModel.findById(id).exec();

        if(!brand){
            throw  new NotFoundException(
                'Không tìm thấy thương hiệu'
            )
        };

        //Nếu cập nhật slug kiểm tra trùng
        if (updateBrandDTO.slug !== undefined){
            const existingSlug = await this.brandModel.findOne({
                slug:updateBrandDTO.slug,
                _id:{$ne:id},
            }).exec();

            if (existingSlug){
                throw new ConflictException(
                    'Thương hiệu sản phẩm đã tồn tại'
                );
            }
        };

        // cập nhật brand
        try {
            const updateBrand = await this.brandModel.findByIdAndUpdate(
                id,
                {$set:updateBrandDTO},
                {
                    new: true,
                    runValidators: true 
                },
            ).exec();

            return updateBrand;
        }catch(error){
            if (error instanceof MongoServerError && error.code === 11000){
                throw new ConflictException(
                    'Thương hiệu đã tồn tại trong Mongo'
                );
            }
            throw error;
        }
    }

    async remove (id:string){
        //Kiem tra dinh dang ObjectId
        if(!isValidObjectId(id)){
            throw new BadRequestException(
                'Brand ID không hợp lệ'
            );
        }

        //Kiểm tra brand có tồn tại không
        const brand = await this.brandModel.findById(id).exec()
        
        if (!brand){
            throw new NotFoundException(
                'Không tìm thấy thương hiệu'
            );
        }

        // Kiểm tra product đang tham chiếu
        const existingProduct = await this.productModel.findOne({brandId:id}).exec()

        if(existingProduct){
            throw new ConflictException(
                'Không thể xóa thương hiệu đang có sản phẩm'
            );
        }

        //xóa brand
        const deleteBrand = await this.brandModel.findByIdAndDelete(id).exec();

        if(!deleteBrand){
            throw new NotFoundException(
                'Thương hiệu không còn tồn tại'
            );
        }

        // trả về kết quả
        return{
            message:'Xóa thương hiệu thành công',
            brand:deleteBrand,
        };
    }

}
