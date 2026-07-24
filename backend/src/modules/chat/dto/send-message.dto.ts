import { IsInt, IsString, Length, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 发送消息 DTO
 */
export class SendMessageDto {
  @ApiProperty({ description: '会话 ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId!: number;

  @ApiProperty({ description: '消息内容', maxLength: 2000, minLength: 1 })
  @IsString()
  @Length(1, 2000, { message: '消息内容长度需在 1-2000 之间' })
  content!: string;
}
