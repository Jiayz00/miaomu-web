import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

/**
 * 管理员变更用户角色 DTO
 */
export class UpdateUserRoleDto {
  @ApiProperty({ description: '角色', enum: Role, example: Role.ADMIN })
  @IsEnum(Role, { message: '角色值无效' })
  role!: Role;
}
