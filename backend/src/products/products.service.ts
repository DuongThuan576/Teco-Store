import { Injectable, NotFoundException, BadRequestException, ConflictException} from '@nestjs/common';
import { CreateProductDTO } from './create-product.dto';
import { UpdateProductDTO } from './update-product.dto';

import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import {Product} from './schemas/product.schema';

import {MongoServerError} from 'mongodb';
import { VariantDTO } from './variant.dto';
import { UpdateVariantDTO } from './update-variant.dto';

import { Types } from 'mongoose';

@Injectable()
export class ProductsService {
    constructor(
        @InjectModel(Product.name) 
        private readonly productModel: Model<Product>){}

    async findAll() {
        return await this.productModel.find().exec();
    }

    async findOne(id: string) {
        if (!isValidObjectId(id)){
            throw new BadRequestException(
                'ID sản phẩm không hợp lệ.'
            );
        }
        const product = await this.productModel.findById(id).exec();

        if (!product) {
            throw new NotFoundException(
                `Khong tim thay san pham co id = ${id}`
            );
        }
        return product;
    }

    async findBySlug(slug:string){
        const product = await this.productModel.findOne({slug: slug}).exec()

        if(!product){
            throw new NotFoundException(
                `Không tìm thấy sản phẩm với slug ${slug}`,
            );
        }
        return product;
    }



    async findVariantBySku(slug: string, sku: string) {
        // 1. Tìm đúng Product theo slug
        // và xác nhận SKU thuộc Product đó
        const product = await this.productModel
            .findOne({
            slug: slug,
            'variants.sku': sku,
            })
            .exec();

        if (!product) {
            throw new NotFoundException(
            'Không tìm thấy sản phẩm hoặc SKU tương ứng',
            );
        }

        // 2. Tìm Variant đang được chọn
        const variant = product.variants.find(
            (item) => item.sku === sku,
        );

        if (!variant) {
            throw new NotFoundException(
            `Không tìm thấy Variant có SKU ${sku}`,
            );
        }

        // 3. Trả về Product và Variant tương ứng
        return {
            product: {
            _id: product._id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            images: product.images,
            specifications: product.specifications,
            isActive: product.isActive,
            },
            variant,
            variants: product.variants,
        };
    }


    async create(createProductDTO: CreateProductDTO) {
        // Lấy danh sách sku
        const skus = createProductDTO.variants.map(
            (variant) => variant.sku.trim(),
        )

        //Kiểm tra SKU trùng trong request
        const uniqueSkus = new Set(skus);

        if (uniqueSkus.size !== skus.length){
            throw new ConflictException(
                'Có SKU bị trùng lặp'
            )
        }

        // Kiểm tra slug trùng trong mongo
        const existingProduct = await this.productModel.findOne(
            {slug:createProductDTO.slug }
        ).exec();

        if(existingProduct){
            throw new ConflictException(
                `Sản phẩm với slug '${createProductDTO.slug}' đã tồn tại`
            )
        }

        //Kiểm tra sku trùng với Product khác
        const existingSku = await this.productModel.findOne({
            'variants.sku': {$in : skus},
        }).exec();

        if (existingSku){
            throw new ConflictException(
                'Một hoặc nhiều Sku đã tồn tại',
            );
        }

        // tạo và lưu product
        const newProduct = new this.productModel({
            ...createProductDTO,
            variants: createProductDTO.variants.map(
            (variant, index) => ({
                ...variant,
                sku: skus[index],
            }),
            ),
        });
        try{
            return await newProduct.save(); 
        }catch (error){
            if (
                error instanceof MongoServerError && 
                error.code === 11000
            ){
                throw new ConflictException(
                    'slug  hoặc sku đã tồn tại trong MongoDB',
                );
            }

            throw error;
        }
        
    }

    async update(id: string, updateProductDTO: UpdateProductDTO) {
        //Kiểm tra id hợp lệ 
        if (!isValidObjectId(id)){
            throw new BadRequestException(
                'ID sản phẩm không hợp lệ'
            );
        }

        //Nếu cập nhật slug thì kiểm tra trùng
        if (updateProductDTO.slug !== undefined){
            const existingSlug = await this.productModel.findOne({slug: updateProductDTO.slug, _id : {$ne:id},
            }).exec()
            
            if (existingSlug){
                throw new ConflictException(
                    'Slug sản phẩm đã tồn tại',
                );
            }
        }

        //Cập nhật Product
        const product = await this.productModel
        .findByIdAndUpdate(
            id,
            { $set : updateProductDTO},
            {
                new: true,
                runValidators: true,
            },
        )
        .exec();

        //Kiểm tra Product tồn tại
        if (!product){
            throw new NotFoundException(
                `Không tìm thấy sản phẩm có ID = ${id}`
            );
        }

        return product;
    }

    async remove(id: string) {
        if (!isValidObjectId(id)){
            throw new BadRequestException(
                `ID sản phẩm không hợp lệ`
            );
        }

        const product = await this.productModel.findByIdAndDelete(id).exec();

        if(!product){
            throw new NotFoundException(
                `Không tìm thấy sản phẩm có ID = ${id}`
            );
        }
        return {
            message: "xóa sản phẩm thành công",
            product,
        };
    }

    async addVariant(productId:string, variantDTO: VariantDTO){
        //Kiểm tra productId và lấy product
        await this.findOne(productId);

        //Chuẩn hóa SKU
        const sku = variantDTO.sku.trim();

        //kiểm tra sku tồn tại chưa
        const existingSku = await this.productModel.findOne({'variants.sku':sku,}).exec();

        if (existingSku){
            throw new ConflictException('SKU đã tồn tại');
        }
        try{
            return await this.productModel.findByIdAndUpdate(
                productId,
                {
                    $push: {
                        variants:{
                            ...variantDTO,
                            sku,
                        },
                    },
                },
                {
                    new : true,
                    runValidators: true,
                },
            ).exec();
        }catch (error){
            if ( error instanceof MongoServerError && error.code === 11000){
                throw new ConflictException(
                    `SKU đã tồn tại trong MONGO`
                );
            }
            throw error;
        }
    }

    //sửa variants
    async updateVariant(productId:string, variantId:string, updateVariantDTO:UpdateVariantDTO){
        //Kiểm tra định dạng object
        if (!isValidObjectId(productId) || !isValidObjectId(variantId)){
            throw new BadRequestException(
                'Product Id hoặc Variant ID không hợp lệ'
            );
        }

        //Kiểm tra product tồn tại
        await this.findOne(productId);

        //chỉ cập nhật các trường được gửi
        const updates = Object.fromEntries(
            Object.entries(updateVariantDTO).map(
                ([key, value]) =>[`variants.$[variant].${key}`, value],
            ),
        );

        if (Object.keys(updates).length === 0){
            throw new BadRequestException(
                'Không có dữ liệu cập nhật.',
            );
        }

        const product = await this.productModel.findOneAndUpdate(
            {
                _id : productId,
                'variants._id': new Types.ObjectId(variantId),
            },
            {$set: updates},
            {
                new: true,
                runValidators: true,
                arrayFilters: [
                    {'variant._id': new Types.ObjectId(variantId)},
                ],
            },
        ).exec();

        if(!product){
            throw new NotFoundException(
                'Không tìm thấy Variant trong Product'
            );
        }
        return product
    }

    // xóa variants
    async removeVariant(
        productId: string,
        variantId: string,
        ) {
        // 1. Kiểm tra ObjectId
        if (
            !isValidObjectId(productId) ||
            !isValidObjectId(variantId)
        ) {
            throw new BadRequestException(
            'Product ID hoặc Variant ID không hợp lệ',
            );
        }

        // 2. Kiểm tra Product tồn tại
        await this.findOne(productId);

        // 3. Xóa đúng Variant
        const product = await this.productModel
            .findOneAndUpdate(
            {
                _id: productId,
                'variants._id': new Types.ObjectId(variantId),
            },
            {
                $pull: {
                variants: {
                    _id: new Types.ObjectId(variantId),
                },
                },
            },
            {
                new: true,
                runValidators: true,
            },
            )
            .exec();

        // 4. Kiểm tra Variant có tồn tại không
        if (!product) {
            throw new NotFoundException(
            'Không tìm thấy Variant trong Product',
            );
        }

        return {
            message: 'Xóa Variant thành công',
            product,
        };
    }

    //TÌm tất cả Variant
    async findVariants(productId: string) {
    const product = await this.findOne(productId);

    return product.variants;
    }

    //Tìm 1 variant theo Id
    async findVariantById(
        productId: string,
        variantId: string,
        ) {
        if (!isValidObjectId(variantId)) {
            throw new BadRequestException(
            'Variant ID không hợp lệ',
            );
        }

        const product = await this.findOne(productId);

        const variant = product.variants.find(
            (item) => String(item._id) === variantId,
        );

        if (!variant) {
            throw new NotFoundException(
            'Không tìm thấy Variant trong Product',
            );
        }

        return variant;
    }
    
}