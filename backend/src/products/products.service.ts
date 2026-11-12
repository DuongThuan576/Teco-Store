import { Injectable, NotFoundException, BadRequestException, ConflictException} from '@nestjs/common';
import { CreateProductDTO } from './create-product.dto';
import { UpdateProductDTO } from './update-product.dto';

import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';

import {Product} from './schemas/product.schema';
import { Brand } from '../brands/schemas/brand.schema';
import { Category } from '../categories/schemas/category.schema';
import { ProductLine } from '../productlines/schemas/productline.schema';

import {MongoServerError} from 'mongodb';
import { VariantDTO } from './variant.dto';
import { UpdateVariantDTO } from './update-variant.dto';

import { Types } from 'mongoose';

@Injectable()
export class ProductsService {
    constructor(
        @InjectModel(Product.name)
        private readonly productModel: Model<Product>,

        @InjectModel(Brand.name)
        private readonly brandModel: Model<Brand>,

        @InjectModel(Category.name)
        private readonly categoryModel: Model<Category>,

        @InjectModel(ProductLine.name)
        private readonly productLineModel: Model<ProductLine>,
    ){}

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
        const {
            categoryId,
            brandId,
            productLineId,
        } = createProductDTO;

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

        // Kiểm tra Category nếu được cung cấp
        if (categoryId) {
            const category = await this.categoryModel
                .findById(categoryId)
                .exec();

            if (!category) {
                throw new NotFoundException(
                'Danh mục không tồn tại',
                );
            }
        }

        // Kiểm tra Brand nếu được cung cấp
        if (brandId) {
            const brand = await this.brandModel
                .findById(brandId)
                .exec();

            if (!brand) {
                throw new NotFoundException(
                'Thương hiệu không tồn tại',
                );
            }
        }
        
        // Kiểm tra ProductLine nếu được cung cấp
        if (productLineId) {
            const productLine = await this.productLineModel
                .findById(productLineId)
                .exec();

            if (!productLine) {
                throw new NotFoundException(
                'Dòng sản phẩm không tồn tại',
                );
            }

            // Đối chiếu các thông tin đã được cung cấp
            if (
                brandId &&
                String(productLine.brandId) !== brandId
            ) {
                throw new BadRequestException(
                'ProductLine không thuộc Brand đã chọn',
                );
            }

            if (
                categoryId &&
                String(productLine.categoryId) !== categoryId
            ) {
                throw new BadRequestException(
                'ProductLine không thuộc Category đã chọn',
                );
            }
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

    
    async update(
        id: string,
        dto: UpdateProductDTO,
        ) {
        // 1. Kiểm tra ObjectId
        if (!isValidObjectId(id)) {
            throw new BadRequestException(
            'Product ID không hợp lệ',
            );
        }

        // 2. Kiểm tra Product tồn tại
        const existingProduct = await this.productModel
            .findById(id)
            .exec();

        if (!existingProduct) {
            throw new NotFoundException(
            'Không tìm thấy sản phẩm',
            );
        }

        // 3. Không cho PATCH body rỗng
        if (Object.keys(dto).length === 0) {
            throw new BadRequestException(
            'Không có dữ liệu cập nhật',
            );
        }

        // 4. Kiểm tra slug trùng
        if (dto.slug !== undefined) {
            const existingSlug = await this.productModel
            .findOne({
                slug: dto.slug,
                _id: { $ne: id },
            })
            .exec();

            if (existingSlug) {
            throw new ConflictException(
                'Slug sản phẩm đã tồn tại',
            );
            }
        }

        // 5. Xác định dữ liệu sau cập nhật
        const brandId =
            dto.brandId !== undefined
            ? dto.brandId
            : existingProduct.brandId?.toString() ?? null;

        const categoryId =
            dto.categoryId !== undefined
            ? dto.categoryId
            : existingProduct.categoryId?.toString() ?? null;

        const productLineId =
            dto.productLineId !== undefined
            ? dto.productLineId
            : existingProduct.productLineId?.toString() ?? null;

        // 6. Kiểm tra Brand
        if (brandId !== null) {
            if (!isValidObjectId(brandId)) {
            throw new BadRequestException(
                'Brand ID không hợp lệ',
            );
            }

            const brand = await this.brandModel
            .findById(brandId)
            .exec();

            if (!brand) {
            throw new NotFoundException(
                'Thương hiệu không tồn tại',
            );
            }
        }

        // 7. Kiểm tra Category
        if (categoryId !== null) {
            if (!isValidObjectId(categoryId)) {
            throw new BadRequestException(
                'Category ID không hợp lệ',
            );
            }

            const category = await this.categoryModel
            .findById(categoryId)
            .exec();

            if (!category) {
            throw new NotFoundException(
                'Danh mục không tồn tại',
            );
            }
        }

        // 8. Kiểm tra ProductLine
        if (productLineId !== null) {
            if (!isValidObjectId(productLineId)) {
            throw new BadRequestException(
                'ProductLine ID không hợp lệ',
            );
            }

            const productLine = await this.productLineModel
            .findById(productLineId)
            .exec();

            if (!productLine) {
            throw new NotFoundException(
                'Dòng sản phẩm không tồn tại',
            );
            }

            // Product có ProductLine thì cần Brand,
            // Category tương ứng với ProductLine đó.
            if (
            brandId !== String(productLine.brandId)
            ) {
            throw new BadRequestException(
                'ProductLine không thuộc Brand đã chọn',
            );
            }

            if (
            categoryId !== String(productLine.categoryId)
            ) {
            throw new BadRequestException(
                'ProductLine không thuộc Category đã chọn',
            );
            }
        }

        // 9. Cập nhật Product
        try {
            const updatedProduct =
            await this.productModel.findByIdAndUpdate(
                id,
                { $set: dto },
                {
                returnDocument: 'after',
                runValidators: true,
                },
            ).exec();

            if (!updatedProduct) {
            throw new NotFoundException(
                'Không tìm thấy sản phẩm',
            );
            }

            return updatedProduct;
        } catch (error) {
            if (
            error instanceof MongoServerError &&
            error.code === 11000
            ) {
            throw new ConflictException(
                'Dữ liệu sản phẩm bị trùng trong MongoDB',
            );
            }

            throw error;
        }
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

    
    async addVariant(
        productId: string,
        variantDTO: VariantDTO,
        ) {
        // 1. Kiểm tra Product ID hợp lệ và tồn tại
        const product = await this.findOne(productId);

        // 2. Chuẩn hóa SKU
        const sku = variantDTO.sku.trim();

        if (!sku) {
            throw new BadRequestException(
            'SKU không được để trống',
            );
        }

        // 3. Kiểm tra SKU đã tồn tại trong hệ thống
        const existingSku = await this.productModel
            .findOne({ 'variants.sku': sku })
            .exec();

        if (existingSku) {
            throw new ConflictException(
            'SKU đã tồn tại',
            );
        }

        // 4. Thêm Variant bằng thao tác có điều kiện
        try {
            const updatedProduct =
            await this.productModel.findOneAndUpdate(
                {
                _id: product._id,
                'variants.sku': { $ne: sku },
                },
                {
                $push: {
                    variants: {
                    ...variantDTO,
                    sku,
                    },
                },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                },
            ).exec();

            if (!updatedProduct) {
            // Product có thể đã bị xóa sau bước kiểm tra
            const stillExists = await this.productModel
                .exists({ _id: productId });

            if (!stillExists) {
                throw new NotFoundException(
                    'Product không còn tồn tại',
                );
            }

                throw new ConflictException(
                    'SKU đã tồn tại trong Product',
                );
            }

            return updatedProduct;
        } catch (error) {
            if (
                error instanceof MongoServerError &&
                error.code === 11000
            ) {
                throw new ConflictException(
                    'SKU đã tồn tại trong MongoDB',
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
                returnDocument: 'after',
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
                returnDocument: 'after',
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