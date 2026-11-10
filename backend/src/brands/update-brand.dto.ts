import { CreateBrandDTO } from "./create-brand.dto";
import { PartialType } from "@nestjs/mapped-types";

export class UpdateBrandDTO extends PartialType(
    CreateBrandDTO
){}