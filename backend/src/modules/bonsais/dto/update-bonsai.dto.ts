import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateBonsaiDto } from './create-bonsai.dto';

/**
 * 更新盆景 DTO
 * 继承自 CreateBonsaiDto，所有字段可选
 */
export class UpdateBonsaiDto extends PartialType(
  OmitType(CreateBonsaiDto, ['slug'] as const),
) {}
