import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

/**
 * 更新分类 DTO
 * 继承自 CreateCategoryDto，所有字段可选（不允许改 slug）
 */
export class UpdateCategoryDto extends PartialType(
  OmitType(CreateCategoryDto, ['slug'] as const),
) {}
