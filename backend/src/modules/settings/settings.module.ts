import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SettingsController } from './settings.controller';
import {
  SettingsService,
  CategoriesLayoutService,
  SiteAssetService,
} from './settings.service';

/**
 * 站点设置模块
 *
 * 启动时自动初始化默认设置（幂等）
 *
 * 依赖：
 * - JwtModule：用于生成/校验草稿预览 token（异步注册，复用全局 JWT_SECRET）
 * - ConfigService：JwtModule 异步工厂依赖，同时 SettingsService 也需读取 jwt.secret
 */
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [SettingsController],
  providers: [SettingsService, CategoriesLayoutService, SiteAssetService],
  exports: [SettingsService, CategoriesLayoutService, SiteAssetService],
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
