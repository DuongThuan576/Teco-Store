import { Test, TestingModule } from '@nestjs/testing';
import { ProductlinesService } from './productlines.service';

describe('ProductlinesService', () => {
  let service: ProductlinesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductlinesService],
    }).compile();

    service = module.get<ProductlinesService>(ProductlinesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
