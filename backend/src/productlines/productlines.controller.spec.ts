import { Test, TestingModule } from '@nestjs/testing';
import { ProductlinesController } from './productlines.controller';

describe('ProductlinesController', () => {
  let controller: ProductlinesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductlinesController],
    }).compile();

    controller = module.get<ProductlinesController>(ProductlinesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
