import { PartialType, OmitType } from "@nestjs/mapped-types";
import { VariantDTO } from "./variant.dto";

export class UpdateVariantDTO extends PartialType(
    OmitType(VariantDTO, ['sku'] as const)
){}