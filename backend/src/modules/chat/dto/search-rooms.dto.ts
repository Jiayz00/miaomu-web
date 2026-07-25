import {
  IsDateString,
  IsOptional,
  IsString,
  Length,
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 至少填写一个搜索/筛选字段
 */
@ValidatorConstraint({ name: 'atLeastOneSearchField', async: false })
class AtLeastOneSearchFieldConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as SearchRoomsDto;
    return !!(
      obj.bonsaiName?.trim() ||
      obj.username?.trim() ||
      obj.keyword?.trim() ||
      obj.startDate ||
      obj.endDate
    );
  }

  defaultMessage(): string {
    return '请至少填写一项搜索/筛选条件';
  }
}

/**
 * 类级别装饰器：确保搜索 DTO 至少有一个有效字段
 */
function AtLeastOneSearchField(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: AtLeastOneSearchFieldConstraint,
    });
  };
}

/**
 * 会话搜索/筛选 DTO
 *
 * 支持按盆景名称、用户名、消息关键字、时间区间检索会话
 */
export class SearchRoomsDto {
  @ApiPropertyOptional({ description: '盆景名称（模糊匹配）', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  bonsaiName?: string;

  @ApiPropertyOptional({ description: '用户名（模糊匹配）', maxLength: 50 })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  username?: string;

  @ApiPropertyOptional({ description: '消息内容关键字（模糊匹配）', maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  keyword?: string;

  @ApiPropertyOptional({ description: '开始日期（ISO 日期，含）' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期（ISO 日期，含）' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @AtLeastOneSearchField()
  _atLeastOneField?: unknown;
}
