import { PartialType } from "@nestjs/mapped-types";
import { CreateProductLineDTO } from "./create-productline.dto";

export class UpdateProductLineDTO extends PartialType(
    CreateProductLineDTO
){}