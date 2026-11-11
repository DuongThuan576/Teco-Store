
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException } from '@nestjs/common';

import { ProductsService } from './products.service';
import { Product } from './schemas/product.schema';
import { Brand } from '../brands/schemas/brand.schema';
import { Category } from '../categories/schemas/category.schema';
import { ProductLine } from '../productlines/schemas/productline.schema';

describe('ProductsService', () => {
  let service: ProductsService;

  // Mock các phương thức Mongoose
  const mockProductModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    exists: jest.fn(),
  };

  // Chạy trước mỗi test
  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          ProductsService,
          {
            provide: getModelToken(Product.name),
            useValue: mockProductModel,
          },
          {
            provide: getModelToken(Brand.name),
            useValue: {},
          },
          {
            provide: getModelToken(Category.name),
            useValue: {},
          },
          {
            provide: getModelToken(ProductLine.name),
            useValue: {},
          },
        ],
      }).compile();

    service = module.get<ProductsService>(
      ProductsService,
    );
  });

  // TEST 1
  it('ProductsService phải được khởi tạo', () => {
    expect(service).toBeDefined();
  });

  // Nhóm các test ADD Variant
  describe('addVariant', () => {
    const productId = '690000000000000000000001';

    const variantDTO = {
      sku: 'IP16-BLACK-256',
      color: 'Black',
      price: 20000000,
      stock: 10,
    };

    // TEST 2
    it('Thêm Variant thành công khi SKU chưa tồn tại', async () => {
      const mockProduct = {
        _id: productId,
        name: 'iPhone 16',
        variants: [],
      };

      const updatedProduct = {
        ...mockProduct,
        variants: [variantDTO],
      };

      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      mockProductModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      mockProductModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedProduct),
      });

      const result = await service.addVariant(
        productId,
        variantDTO,
      );

      expect(result).toEqual(updatedProduct);

      expect(
        mockProductModel.findOneAndUpdate,
      ).toHaveBeenCalledWith(
        {
          _id: productId,
          'variants.sku': {
            $ne: variantDTO.sku,
          },
        },
        {
          $push: {
            variants: variantDTO,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );
    });

    // TEST 3
    it('Từ chối thêm Variant khi SKU đã tồn tại', async () => {
      const mockProduct = {
        _id: productId,
        name: 'iPhone 16',
        variants: [],
      };

      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      mockProductModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: '690000000000000000000002',
        }),
      });

      await expect(
        service.addVariant(productId, variantDTO),
      ).rejects.toThrow(ConflictException);

      expect(
        mockProductModel.findOneAndUpdate,
      ).not.toHaveBeenCalled();
    });
  });
});
