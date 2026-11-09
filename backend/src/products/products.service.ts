import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDTO } from './create-product.dto';
import { UpdateProductDTO } from './update-product.dto';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {Product, ProductDocument} from './schemas/product.schema';

@Injectable()
export class ProductsService {
    constructor(
        @InjectModel(Product.name) 
        private readonly productModel: Model<Product>){}
    private products = [
        {
            id: 1,
            name: "Iphone 18 Pro Max",
            price: 34990000,
            brand: "Apple",
        },
        {
            id: 2,
            name: "Samsung Galaxy S26",
            price: 22990000,
            brand: "Samsung",
        },
    ];

    findAll() {
        return this.products;
    }

    findOne(id: number) {
        const product = this.products.find(
            (product) => product.id === id);

        if (!product) {
            throw new NotFoundException(
                `Khong tim thay san pham co id = ${id}`
            );
        }
        return product;
    }

    create(createProductDTO: CreateProductDTO) {
        const newProduct = {
            id: this.products.length + 1,
            ...createProductDTO,
        };

        this.products.push(newProduct);
        return newProduct;
    }

    update(id: number, updateProductDTO: UpdateProductDTO) {
        const product = this.findOne(id);

        Object.assign(product, Object.fromEntries(
            Object.entries(updateProductDTO).filter(
                ([_, value]) => value !== undefined
            )
        )
        );

        return product;
    }

    remove(id: number) {
        const product = this.findOne(id);
        const index = this.products.indexOf(product);
        this.products.splice(index, 1)
        return {
            message: "xóa sản phẩm thành công",
            product,
        };
    }
}