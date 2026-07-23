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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

/**
 * 文件上传控制器（管理员）
 * 路由前缀：/admin/upload
 *
 * 限流：上传接口独立限流 10 次/分钟，防止 OOM
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
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadSingle(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadSingle(file);
  }

  @Post('multiple')
  @ApiOperation({ summary: '多图上传（最多10张）' })
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
    FileFieldsInterceptor([{ name: 'files', maxCount: 10 }], {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadMultiple(@UploadedFiles() files: { files?: Express.Multer.File[] }) {
    return this.uploadService.uploadMultiple(files.files || []);
  }
}
