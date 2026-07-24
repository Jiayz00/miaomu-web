import { Module, OnModuleInit } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import {
  SettingsService,
  CategoriesLayoutService,
} from './settings.service';

/**
 * 站点设置模块
 *
 * 启动时自动初始化默认设置（幂等）
 */
@Module({
  controllers: [SettingsController],
  providers: [SettingsService, CategoriesLayoutService],
  exports: [SettingsService, CategoriesLayoutService],
})
export class SettingsModule implements OnModuleInit {
  constructor(private readonly settingsService: SettingsService) {}

  async onModuleInit(): Promise<void> {
    // 模块初始化时确保默认设置存在（已存在的 key 不覆盖）
    await this.settingsService.initDefaults();
    // 同时确保默认主页布局存在并已激活
    await this.settingsService.initDefaultLayout();
  }
}
