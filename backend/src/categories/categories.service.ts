import { InjectModel } from '@nestjs/mongoose';

import { Category } from './schemas/category.schema';

import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateCategoryDTO } from './create-category.dto';
import { MongoServerError } from 'mongodb';

import { UpdateCategoryDTO } from './update-category.dto';
import { Types, isValidObjectId, Model } from 'mongoose';

import { Product } from '../products/schemas/product.schema';
import { ProductLine } from '../productlines/schemas/productline.schema';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectModel(Category.name)
        private readonly categoryModel: Model<Category>,

        @InjectModel(Product.name)
        private readonly productModel: Model<Product>,

        @InjectModel(ProductLine.name)
        private readonly productLineModel: Model<ProductLine>
    ){}

    async create(createCategoryDTO:CreateCategoryDTO){
        //kiểm tra slug tồn tại chưa
        const existingSlug = await this.categoryModel.findOne({slug: createCategoryDTO.slug}).exec();
        if (existingSlug){
            throw new ConflictException(
                'Slug danh mục đã tồn tại',
            );
        }

        //Kiểm tra danh mục cha nếu có
        if(createCategoryDTO.parentId){
            const parentCategory = await this.categoryModel.findById(createCategoryDTO.parentId).exec();

            if (!parentCategory){
                throw new NotFoundException(
                    'Danh mục cha không tồn tại',
                );
            }
        }

        //Tạo category mới
        const newCategory = new this.categoryModel(createCategoryDTO) 

        //Lưu vào mongo
        try{
            return await newCategory.save();
        }catch(error){
            if (error instanceof MongoServerError && error.code === 11000){
                throw new ConflictException(
                    'Danh mục đã tồn tại trong Mongo',
                );
            }
            throw error;
        }
    }
    
    //Lấy tất cả danh mục
    async findAll(){
        return this.categoryModel.find().exec()
    }

    //Tìm danh mục theo slug
    async findBySlug(slug:string){
        const category = await this.categoryModel.findOne({slug}).exec();

        if(!category){
            throw new NotFoundException(
                'Không tìm thấy danh mục với slug: ' +slug
            );
        }
        return category;
    }

    //Cập nhật danh mục
    async update(id:string, updateCategoryDTO:UpdateCategoryDTO){
        //Kiểm tra ObjectID
        if (!isValidObjectId(id)){
            throw new BadRequestException(
                'Category ID không hợp lệ'
            );
        }

        //Kiểm tra Category hiện tại
        const category = await this.categoryModel.findById(id).exec();

        if (!category){
            throw new NotFoundException(
                'Không tìm thấy danh mục'
            );
        }

        //Kiểm tra slug trùng với danh mục khác
        if (updateCategoryDTO.slug !== undefined){
            const existingSlug = await this.categoryModel.findOne({slug:updateCategoryDTO.slug, _id: {$ne:id}}).exec()

            if (existingSlug){
                throw new ConflictException(
                    'Slug danh mục đã tồn tại'
                );
            }
        }

        //Kiểm tra thay đổi danh mục cha
        if ( updateCategoryDTO.parentId !==undefined &&
            updateCategoryDTO.parentId !== null
        ){
            const parentId = updateCategoryDTO.parentId;

            //Không cho một category làm cha chính nó
            if (parentId === id){
                throw new BadRequestException(
                    'Danh mục không thể làm cha của chính nó'
                );
            }

            //Kiểm tra danh mục cha tồn tại
            const parent = await this.categoryModel.findById(parentId).exec();

            if (!parent){
                throw new NotFoundException(
                    'Danh mục cha không tồn tại',
                );
            }

            // Đi ngược từ danh mục cha mới lên các cấp cha
            // để phát hiện vòng lặp
            const visited = new Set<string>();
            let currentParent: typeof parent | null = parent;

            while (currentParent){
                const currentId = String(currentParent._id);

                if(currentId === id || visited.has(currentId)){
                    throw new BadRequestException(
                        'Quan hệ danh mục cha-con tạo vòng lặp'
                    );
                }

                visited.add(currentId);
                
                if(!currentParent.parentId){
                    break;
                }

                currentParent = await this.categoryModel.findById(currentParent.parentId).exec();

                if (!currentParent){
                    throw new NotFoundException(
                        'Có danh mục cha không tồn tại',
                    );
                }
            }
        }

        //Cập nhật category
        try{
            const updateCategory= await this.categoryModel.findByIdAndUpdate(
                id,
                {$set: updateCategoryDTO},
                {
                    returnDocument: 'after',
                    runValidators:true,
                },
            ).exec();

            if (!updateCategory){
                throw new NotFoundException (
                    'Không tìm thấy danh mục'
                );
            }

            return updateCategory

        }catch(error){
            if (
                error instanceof MongoServerError &&
                error.code === 11000
            ){
                throw new ConflictException(
                    'Danh mục đã tồn tại trong MONGO'
                );
            }
            throw error;
        }
    }

    //Xoa danh muc
    async remove (id:string){
        //Kiem tra object
        if (!isValidObjectId(id)){
            throw new BadRequestException(
                'Category ID khong hop le'
            );
        }

        //Kiem tra category ton tai
        const category = await this.categoryModel.findById(id).exec();

        if(!category){
            throw new NotFoundException(
                'Khong tim thay danh muc',
            );
        }

        //Kiem tra danh muc con
        const childCategory = await this.categoryModel.findOne({ parentId :id }).exec()

        if (childCategory){
            throw new ConflictException(
                'Khong the xoa danh muc co danh muc con.',
            );
        }

        //Kiem tra product dang su dung
        const existingProduct = await this.productModel.findOne({categoryId:id}).exec();

        if (existingProduct){
            throw new ConflictException(
                'Khong the xoa danh muc dang co san pham',
            );
        }
        
        const existingProductLine =
        await this.productLineModel.findOne({ categoryId: id }).exec();

        if (existingProductLine) {
            throw new ConflictException(
                'Không thể xóa category đang được ProductLine sử dụng',
            );
        }


        //Xoa category
        const deletedCategory = await this.categoryModel.findByIdAndDelete(id).exec();

        if(!deletedCategory){
            throw new NotFoundException(
                'Danh muc khong con ton tai',
            );
        }

        return {
            message: "Xoa danh muc thanh cong",
            category: deletedCategory,
        };
    }
}
