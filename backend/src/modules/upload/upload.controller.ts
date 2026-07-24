import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';
import { MAX_FILE_SIZE, MAX_FILES_PER_REQUEST } from './upload.constants';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

/**
 * 文件上传控制器（管理员）
 * 路由前缀：/admin/upload
 *
 * 限流：上传接口独立限流 10 次/分钟，防止 OOM
 *
 * 设计：文件大小上限与单次最大文件数从 upload.constants.ts 读取，
 * 与 UploadService 共享同一常量，避免 5MB / 10 个等魔法数字散落多处
 */
@ApiTags('文件上传')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles(Role.ADMIN)
@Throttle({ default: { ttl: 60_000, limit: 10 } })
@Controller('admin/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @ApiOperation({ summary: '单图上传' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  uploadSingle(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadSingle(file);
  }

  @Post('multiple')
  @ApiOperation({ summary: `多图上传（最多${MAX_FILES_PER_REQUEST}张）` })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'files', maxCount: MAX_FILES_PER_REQUEST }],
      {
        storage: memoryStorage(),
        limits: { fileSize: MAX_FILE_SIZE },
      },
    ),
  )
  uploadMultiple(@UploadedFiles() files: { files?: Express.Multer.File[] }) {
    return this.uploadService.uploadMultiple(files.files || []);
  }
}
