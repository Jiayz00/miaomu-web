import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 单个设置项 DTO（键值对）
 */
export class SettingItemDto {
  @ApiProperty({ description: '设置键', example: 'phone' })
  @IsString()
  @MaxLength(50)
  key!: string;

  @ApiProperty({ description: '设置值', example: '+86 400-888-0000' })
  @IsString()
  @MaxLength(2000)
  value!: string;
}

/**
 * 更新站点设置 DTO
 * 接收键值对数组，事务化更新
 */
export class UpdateSettingsDto {
  @ApiProperty({
    description: '设置项列表（键值对数组）',
    type: [SettingItemDto],
    example: [
      { key: 'phone', value: '+86 400-888-0000' },
      { key: 'show_phone', value: 'true' },
    ],
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, string>;
}

/**
 * 联系信息可见性切换 DTO
 */
export class ToggleVisibilityDto {
  @ApiProperty({ description: '是否展示', example: true })
  @IsBoolean()
  visible!: boolean;
}
