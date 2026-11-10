import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {MongoServerError} from 'mongodb'
import { Model } from 'mongoose';
import { isValidObjectId } from 'mongoose';

import { ProductLine } from './schemas/productline.schema';
import { Brand } from '../brands/schemas/brand.schema';
import { Category } from '../categories/schemas/category.schema';
import { Product } from '../products/schemas/product.schema';

import { CreateProductLineDTO } from './create-productline.dto';
import { UpdateProductLineDTO } from './update-productline.dto';

@Injectable()
export class ProductlinesService {
    constructor(
        @InjectModel(ProductLine.name)
        private readonly productLineModel:Model<ProductLine>,

        @InjectModel(Brand.name)
        private readonly brandModel:Model<Brand>,

        @InjectModel(Category.name)
        private readonly categoryModel : Model<Category>,

        @InjectModel(Product.name)
        private readonly productModel:Model<Product>,
    ){}

    async create (createProductLineDTO: CreateProductLineDTO) {
        const {
            slug,
            brandId,
            categoryId,
            parentId
        } = createProductLineDTO

        //Kiem tra slug trung
        const existingSlug = await this.productLineModel.findOne({slug}).exec();

        if(existingSlug){
            throw new ConflictException(
                'slug dòng sản phẩm đã tồn tại.'
            );
        }

        //Kiểm tra brand tồn tại
        const brand = await this.brandModel.findById(brandId).exec()

        if (!brand){
            throw new NotFoundException(
                'Brand không tồn tại'
            )
        }

        //kiểm tra danh mục tồn tại
        const category = await this.categoryModel.findById(categoryId).exec();

        if (!category){
            throw new NotFoundException(
                'Danh mục không tồn tại'
            )
        }

        //Kiểm tra ProductLine cha nếu chưa có
        if (parentId){
            const parent = await this.productLineModel.findById(parentId).exec();

            if (!parent){
                throw new NotFoundException(
                    'Dòng sản phẩm cha không tồn tại',
                );
            }

            // Kiểm tra brand và category của cha
            if( String(parent.brandId) !== brandId ||
                String(parent.categoryId) !== categoryId
            ){
                throw new BadRequestException(
                    'Dòng sản phẩm cha phải cùng brand và category'
                );
            }
        }
        //tạo sản phẩm mới
        const newProductLine = new this.productLineModel(createProductLineDTO);

        //Lưu vào Mongo
        try{
            return await newProductLine.save();
        }catch(error){
            if (error instanceof MongoServerError && error.code === 11000){
                throw new ConflictException(
                    'slug dòng sản phẩm đã tồn tại trong Mongo'
                )
            }
            throw error;
        }
    }

    async findAll(){
        return await this.productLineModel.find().exec();
    }

    async findBySlug(slug : string){
        const productLine = await this.productLineModel.findOne({slug}).exec();

        if (!productLine){
            throw new NotFoundException(
                `Không tìm thấy dòng sản phẩm với slug: ${slug}`
            );
        }
        return productLine;
    }

    async update(id:string, dto:UpdateProductLineDTO){
        //Kiểm tra Object id hợp lệ
        if (!isValidObjectId(id)){
            throw new BadRequestException(
                'ProductLine ID không hợp lệ'
            );
        }


        if (dto.brandId === null || dto.categoryId === null) {
            throw new BadRequestException(
                'brandId và categoryId không được null',
            );
        }


        //Kiểm tra productLine tồn tại
        const productLine = await this.productLineModel.findById(id).exec()

        if(!productLine){
            throw new NotFoundException(
                'Không thể tìm thấy dòng sản phẩm'
            );
        }

        //Kiểm tra slug trùng
        if(dto.slug !== undefined){
            const existingSlug = await this.productLineModel.findOne({
                slug:dto.slug,
                _id: { $ne : id}
            }).exec()

            if (existingSlug){
                throw new ConflictException(
                    'slug sản phẩm đã tồn tại'
                );
            }
        }

        //Xác định Brand và Category sau cập nhật 
        const brandId = dto.brandId ??
        String(productLine.brandId);

        const categoryId = dto.categoryId ??
        String(productLine.categoryId)

        //Kiểm tra brand mới nếu được gửi
        if (dto.brandId !== undefined){
            const brand = await this.brandModel.findById(brandId).exec();

            if (!brand){
                throw new NotFoundException(
                    'Thương hiệu không tồn tại'
                );
            }
        }
        
        //Kiểm tra category mới nếu được gửi
        if(dto.categoryId !== undefined){
            const category = await this.categoryModel.findById(categoryId).exec()

            if (!category){
                throw new NotFoundException(
                    'Danh mục sản phẩm không tồn tại'
                );
            }
        }

        //Xác định parent sau cập nhật
        const parentId = dto.parentId !== undefined ? dto.parentId
            :productLine.parentId
                ? String(productLine.parentId)
                :null;

        //kiểm tra parent và vòng lặp
        if( parentId !== null ){
            if(String(parentId) === id){
                throw new BadRequestException(
                    'ProductLine không thể làm cha chính nó'
                );
            }

            const parent = await this.productLineModel.findById(parentId).exec();

            if(!parent){
                throw new NotFoundException(
                    'ProductLine không tồn tại'
                );
            }

            const visited = new Set<string>();
            let currentParent : typeof parent|null = parent;

            while (currentParent){
                const currentId = String(currentParent._id);

                if (
                    currentId === id ||
                    visited.has(currentId)
                ){
                    throw new BadRequestException(
                        'Quan hệ ProductLine tạo cha con vòng lặp'
                    );
                }

                visited.add(currentId);

                if(!currentParent.parentId){
                    break;
                }

                currentParent = await this.productLineModel.findById(currentParent.parentId).exec();

                if (!currentParent){
                    throw new NotFoundException(
                        'Có ProductLine cha không tồn tại'
                    );
                }
            }

            //Parent trực tiếp phải cùng Brand và Category
            if (
                String(parent.brandId) !== brandId ||
                String(parent.categoryId) !== categoryId
            ){
                throw new BadRequestException(
                    'ProductLine cha phải cùng category và brand'
                );
            }
        }

        //Kiểm tra các productLine con hiện có
        const mismatchedChild = await this.productLineModel.findOne({
            parentId:id,
            $or:[
                {brandId:{$ne : brandId}},
                {categoryId:{$ne: categoryId}},
            ],
        }).exec();

        if (mismatchedChild){
            throw new ConflictException(
                'Không thể đổi Brand hoặc Category vì không khớp với ProductLine con'
            );
        }

        //Cập nhật mongo
        try{
            const updateProductLine = await this.productLineModel.findByIdAndUpdate(
                id,
                {$set: dto},
                {
                    new:true,
                    runValidators: true
                },
            ).exec()

            if(!updateProductLine){
                throw new NotFoundException(
                    'Không tìm thấy dòng sản phẩm'
                );
            }

            return updateProductLine;
        }catch(error){
            if(error instanceof MongoServerError && error.code === 11000){
                throw new ConflictException(
                    'Slug dòng sản phẩm đã tồn tại trong Mongo'
                );
            }
            throw error;
        }
    }

    async remove (id:string){
        //Kiểm tra định dạng ObjectId
        if (!isValidObjectId(id)){
            throw new BadRequestException (
                'ProductLine ID không hợp lệ'
            );
        }

        //Kiểm tra productline tồn tại 
        const productLine = await this.productLineModel.findById(id).exec();

        if (!productLine){
            throw new NotFoundException(
                'Không tìm thấy dòng sản phẩm',
            );
        }

        //Kiểm tra productline con
        const chilProductLine = await this.productLineModel.findOne({parentId:id}).exec();

        if (chilProductLine){
            throw new ConflictException(
                'Không thể xóa ProductLine đang có dòng sản phẩm con',
            );
        }

        //Kiểm tra Product đang tham chiếu
        const existingProduct = await this.productModel.findOne({productLineId:id}).exec();

        if(existingProduct){
            throw new ConflictException(
                'Không thể xóa ProductLine đang có sản phẩm',
            );
        }

        //Xóa productline
        const deleteProductLine = await this.productLineModel.findByIdAndDelete(id).exec();
        
        if (!deleteProductLine){
            throw new NotFoundException(
                'Dòng sản phẩm không còn tồn tại',
            );
        }

        //trả về kết quả
        return {
            message:'Xóa dòng sản phẩm thành công',
            productLine: deleteProductLine
        };
    }
}
