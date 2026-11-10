import { PartialType, OmitType} from '@nestjs/mapped-types';
import { CreateProductDTO } from "./create-product.dto";

export class UpdateProductDTO extends PartialType (OmitType(CreateProductDTO, ['variants'] as const),)
{}