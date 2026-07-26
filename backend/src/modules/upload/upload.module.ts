import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { SettingsModule } from '../settings/settings.module';

/**
 * 文件上传模块
 *
 * 依赖 SettingsModule：上传成功后调用 SiteAssetService.createFromUpload
 * 持久化资源元数据（url/filename/mime/size/width/height/duration/category）
 * 用于站点编辑器图集面板列出/检索/删除
 */
@Module({
  imports: [SettingsModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
