import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SiteSectionDto } from './dto/update-site-layout.dto';
import {
  CategoriesLayoutConfigDto,
  CategoryCardAspect,
  CategoryLayoutMode,
  CategorySortBy,
} from './dto/update-categories-layout.dto';

/**
 * 站点设置服务
 *
 * 设计：使用 key-value 表存储所有可配置项，便于扩展
 * - 联系方式：phone / email / address / wechat / weibo
 * - 显示开关：show_phone / show_email / show_address / show_wechat / show_weibo
 * - 站点元信息：site_name / site_description / icp（备案号）
 *
 * 公开接口仅返回启用的字段（show_xxx === 'true'），
 * 管理员接口返回全部字段及可见性状态
 */

// 默认设置（首次启动或重置时使用）
export const DEFAULT_SETTINGS: Record<string, string> = {
  // 联系方式
  phone: '+86 400-888-0000',
  email: 'contact@penjing.example.com',
  address: '江苏省苏州市姑苏区盆景园 88 号',
  wechat: '',
  weibo: '',
  // 显示开关（'true' / 'false' 字符串）
  show_phone: 'true',
  show_email: 'true',
  show_address: 'true',
  show_wechat: 'false',
  show_weibo: 'false',
  // 站点元信息
  site_name: '盆景艺术 Penjing',
  site_description: '凝练自然之美，传承千年技艺。',
  icp: '',
};

// 主页默认布局区块配置（与现有首页结构对应）
// 由 initDefaultLayout 在首次启动时写入 SiteLayout 表
// 字段结构与 SiteSectionDto 保持一致
export const DEFAULT_HOMEPAGE_SECTIONS: SiteSectionDto[] = [
  {
    id: 'hero-default',
    type: 'hero',
    title: '方寸之间见天地',
    subtitle: '凝练自然之美，传承千年技艺。每一株盆景，皆是时间与匠心的结晶。',
    visible: true,
    order: 1,
    config: {
      heroImage:
        'https://images.unsplash.com/photo-1524598171347-833e3329d8ab?auto=format&fit=crop&w=1920&q=80',
      eyebrow: 'Penjing · Bonsai Art',
      ctaPrimaryText: '探索收藏',
      ctaPrimaryLink: '/bonsais',
      ctaSecondaryText: '询价咨询',
      ctaSecondaryLink: '/chat',
    },
  },
  {
    id: 'featured-default',
    type: 'featured',
    title: '匠心之选',
    subtitle: '每一株皆经精心甄选，承载着岁月的沉淀与自然的韵律。',
    visible: true,
    order: 2,
    config: {
      limit: 6,
      eyebrow: '精选典藏',
      ctaText: '浏览全部盆景',
      ctaLink: '/bonsais',
    },
  },
  {
    id: 'categories-default',
    type: 'categories',
    title: '探索品类',
    subtitle: '',
    visible: true,
    order: 3,
    config: {
      limit: 4,
      eyebrow: '分类导览',
      showDescription: true,
    },
  },
  {
    id: 'story-default',
    type: 'story',
    title: '以匠心敬自然',
    subtitle: '品牌故事',
    visible: true,
    order: 4,
    config: {
      image:
        'https://images.unsplash.com/photo-1597055181300-e3633a917e3a?auto=format&fit=crop&w=1000&q=80',
      eyebrow: '品牌故事',
      paragraphs: [
        '盆景艺术源远流长，始于唐代，盛于明清。它以"以小见大"的艺术手法，将山川草木的壮丽浓缩于方寸之间，是中华园林艺术的瑰宝。',
        '我们遍访江南名园与岭南古苑，甄选每一株承载岁月痕迹的盆景。从选材、蟠扎到养护，每一步皆遵循古法，又融入现代审美，让千年技艺在当代焕发新生。',
        '在这里，您寻得的不仅是一株盆景，更是一段与自然对话的时光。',
      ],
      badge: { value: '30+', label: '载匠心传承' },
      highlights: [
        { icon: 'leaf', title: '古法', subtitle: '传承技艺' },
        { icon: 'sparkles', title: '甄选', subtitle: '匠心之品' },
      ],
    },
  },
  {
    id: 'cta-default',
    type: 'cta',
    title: '寻觅您的那一株',
    subtitle:
      '每一株盆景皆独一无二。若您心仪某件藏品，或希望寻觅特定品类，欢迎与我们的顾问一对一交流，开启您的盆景收藏之旅。',
    visible: true,
    order: 5,
    config: {
      eyebrow: '私人洽购',
      ctaText: '开始询价',
      ctaLink: '/chat',
    },
  },
];

// 公开接口暴露的字段映射（仅展示 show_xxx === 'true' 的字段）
const CONTACT_FIELDS = ['phone', 'email', 'address', 'wechat', 'weibo'] as const;
const TOGGLE_KEYS = CONTACT_FIELDS.map((f) => `show_${f}`) as string[];

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 初始化默认设置（首次启动时调用）
   * 已存在的 key 不会被覆盖
   */
  async initDefaults(): Promise<void> {
    const existing = await this.prisma.siteSetting.findMany({
      select: { key: true },
    });
    const existingKeys = new Set(existing.map((s) => s.key));
    const toCreate = Object.entries(DEFAULT_SETTINGS).filter(
      ([key]) => !existingKeys.has(key),
    );
    if (toCreate.length === 0) return;

    await this.prisma.$transaction(
      toCreate.map(([key, value]) =>
        this.prisma.siteSetting.create({ data: { key, value } }),
      ),
    );
    this.logger.log(`✅ 初始化 ${toCreate.length} 项默认站点设置`);
  }

  /**
   * 公开接口：返回启用的联系信息
   * 仅返回 show_xxx === 'true' 的字段
   */
  async getPublicSettings(): Promise<{
    contact: { phone?: string; email?: string; address?: string; wechat?: string; weibo?: string };
    site: { name: string; description: string; icp: string };
  }> {
    const settings = await this.prisma.siteSetting.findMany();
    const map = new Map(settings.map((s) => [s.key, s.value]));

    const contact: Record<string, string> = {};
    for (const field of CONTACT_FIELDS) {
      const visible = map.get(`show_${field}`) === 'true';
      if (visible) {
        const val = map.get(field) || '';
        if (val) contact[field] = val;
      }
    }

    return {
      contact,
      site: {
        name: map.get('site_name') || DEFAULT_SETTINGS.site_name,
        description: map.get('site_description') || DEFAULT_SETTINGS.site_description,
        icp: map.get('icp') || '',
      },
    };
  }

  /**
   * 管理员接口：返回全部设置（含可见性开关）
   */
  async getAllSettings(): Promise<Record<string, string>> {
    const settings = await this.prisma.siteSetting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    // 补全缺失的默认值
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (!(key in map)) map[key] = value;
    }
    return map;
  }

  /**
   * 批量更新设置
   * 接收键值对对象，事务化 upsert
   */
  async updateSettings(settings: Record<string, string>): Promise<Record<string, string>> {
    const entries = Object.entries(settings);
    if (entries.length === 0) {
      return this.getAllSettings();
    }

    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.siteSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        }),
      ),
    );

    this.logger.log(`✅ 更新 ${entries.length} 项站点设置: ${entries.map((e) => e[0]).join(', ')}`);
    return this.getAllSettings();
  }

  /**
   * 切换单个字段的可见性
   */
  async toggleVisibility(field: string, visible: boolean): Promise<Record<string, string>> {
    if (!CONTACT_FIELDS.includes(field as (typeof CONTACT_FIELDS)[number])) {
      throw new Error(`不支持的字段: ${field}`);
    }
    const key = `show_${field}`;
    await this.prisma.siteSetting.upsert({
      where: { key },
      update: { value: visible ? 'true' : 'false' },
      create: { key, value: visible ? 'true' : 'false' },
    });
    this.logger.log(`✅ 切换 ${field} 可见性: ${visible}`);
    return this.getAllSettings();
  }

  /**
   * 重置为默认设置
   */
  async resetToDefaults(): Promise<Record<string, string>> {
    await this.prisma.$transaction([
      this.prisma.siteSetting.deleteMany({}),
      ...Object.entries(DEFAULT_SETTINGS).map(([key, value]) =>
        this.prisma.siteSetting.create({ data: { key, value } }),
      ),
    ]);
    this.logger.log('✅ 已重置站点设置为默认值');
    return this.getAllSettings();
  }

  // ============ 主页布局（SiteLayout）============

  /**
   * 初始化默认主页布局（首次启动时调用，幂等）
   * 已存在的 key 不会被覆盖；同时确保有且仅有一条 isActive=true 的记录
   */
  async initDefaultLayout(): Promise<void> {
    const existing = await this.prisma.siteLayout.findUnique({
      where: { key: 'homepage' },
    });
    if (existing) {
      // 已存在：若没有任何激活记录，则激活这条
      const activeCount = await this.prisma.siteLayout.count({
        where: { isActive: true },
      });
      if (activeCount === 0 && !existing.isActive) {
        await this.prisma.siteLayout.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
        this.logger.log('✅ 已激活默认主页布局');
      }
      return;
    }

    await this.prisma.siteLayout.create({
      data: {
        key: 'homepage',
        sections: DEFAULT_HOMEPAGE_SECTIONS as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    });
    this.logger.log('✅ 已创建默认主页布局');
  }

  /**
   * 公开接口：获取指定 key 当前激活的布局配置
   * 用于前台 SSR 渲染主页
   */
  async getActiveLayout(key: string): Promise<{
    key: string;
    sections: SiteSectionDto[];
    isActive: boolean;
  } | null> {
    const layout = await this.prisma.siteLayout.findFirst({
      where: { key, isActive: true },
    });
    if (!layout) return null;
    return {
      key: layout.key,
      sections: (layout.sections as unknown as SiteSectionDto[]) ?? [],
      isActive: layout.isActive,
    };
  }

  /**
   * 管理员接口：获取全部布局列表
   */
  async getAllLayouts(): Promise<
    Array<{
      id: number;
      key: string;
      sections: SiteSectionDto[];
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    const layouts = await this.prisma.siteLayout.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return layouts.map((l) => ({
      id: l.id,
      key: l.key,
      sections: (l.sections as unknown as SiteSectionDto[]) ?? [],
      isActive: l.isActive,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }));
  }

  /**
   * 管理员接口：获取指定 key 的布局（用于编辑回显）
   */
  async getLayoutByKey(key: string): Promise<{
    id: number;
    key: string;
    sections: SiteSectionDto[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const layout = await this.prisma.siteLayout.findUnique({
      where: { key },
    });
    if (!layout) return null;
    return {
      id: layout.id,
      key: layout.key,
      sections: (layout.sections as unknown as SiteSectionDto[]) ?? [],
      isActive: layout.isActive,
      createdAt: layout.createdAt,
      updatedAt: layout.updatedAt,
    };
  }

  /**
   * 管理员接口：更新指定 key 的布局 sections
   * 若该 key 不存在则创建；同时按 order 升序排序 sections
   */
  async updateLayout(
    key: string,
    sections: SiteSectionDto[],
  ): Promise<{
    id: number;
    key: string;
    sections: SiteSectionDto[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> {
    // 入库前按 order 升序排序，保证渲染顺序稳定
    const sorted = [...sections].sort((a, b) => a.order - b.order);

    const layout = await this.prisma.siteLayout.upsert({
      where: { key },
      update: { sections: sorted as unknown as Prisma.InputJsonValue },
      create: {
        key,
        sections: sorted as unknown as Prisma.InputJsonValue,
        isActive: false,
      },
    });

    // 若当前没有任何激活的布局，自动激活这条（保证前台始终有布局可用）
    const activeCount = await this.prisma.siteLayout.count({
      where: { isActive: true },
    });
    if (activeCount === 0) {
      await this.prisma.siteLayout.update({
        where: { id: layout.id },
        data: { isActive: true },
      });
    }

    this.logger.log(`✅ 更新主页布局 [${key}]，共 ${sorted.length} 个区块`);
    const refreshed = await this.prisma.siteLayout.findUnique({ where: { key } });
    return {
      id: refreshed!.id,
      key: refreshed!.key,
      sections: (refreshed!.sections as unknown as SiteSectionDto[]) ?? [],
      isActive: refreshed!.isActive,
      createdAt: refreshed!.createdAt,
      updatedAt: refreshed!.updatedAt,
    };
  }

  /**
   * 管理员接口：激活指定 key 的布局
   * 事务化：先全部置为 inactive，再激活目标 key，确保唯一性
   */
  async activateLayout(key: string): Promise<{
    id: number;
    key: string;
    isActive: boolean;
  }> {
    const exists = await this.prisma.siteLayout.findUnique({ where: { key } });
    if (!exists) {
      throw new NotFoundException(`布局 [${key}] 不存在`);
    }

    await this.prisma.$transaction([
      // 先全部取消激活
      this.prisma.siteLayout.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      }),
      // 再激活目标 key
      this.prisma.siteLayout.update({
        where: { key },
        data: { isActive: true },
      }),
    ]);

    this.logger.log(`✅ 已激活主页布局 [${key}]`);
    return { id: exists.id, key, isActive: true };
  }

  /**
   * 管理员接口：重置指定 key 的布局为默认配置
   * 仅当 key === 'homepage' 时支持重置为默认
   */
  async resetLayout(key: string): Promise<{
    id: number;
    key: string;
    sections: SiteSectionDto[];
    isActive: boolean;
  }> {
    if (key !== 'homepage') {
      throw new NotFoundException(`仅支持重置 homepage 布局`);
    }

    const layout = await this.prisma.siteLayout.upsert({
      where: { key },
      update: {
        sections: DEFAULT_HOMEPAGE_SECTIONS as unknown as Prisma.InputJsonValue,
      },
      create: {
        key,
        sections: DEFAULT_HOMEPAGE_SECTIONS as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    this.logger.log(`✅ 已重置主页布局 [${key}] 为默认配置`);
    return {
      id: layout.id,
      key: layout.key,
      sections: (layout.sections as unknown as SiteSectionDto[]) ?? [],
      isActive: layout.isActive,
    };
  }
}

export { CONTACT_FIELDS, TOGGLE_KEYS };

// ============ 分类页布局配置（SiteSetting JSON）============

/**
 * 分类页布局配置的存储 key
 * 通过 SiteSetting 表存储 JSON 字符串，复用现有 key-value 结构
 */
const CATEGORIES_LAYOUT_KEY = 'categories_layout_config';

/**
 * 默认分类页布局配置
 * 与前端 DEFAULT_CATEGORIES_LAYOUT 保持一致，修改时需同步两端
 */
export const DEFAULT_CATEGORIES_LAYOUT: CategoriesLayoutConfigDto = {
  layout: CategoryLayoutMode.GRID,
  aspect: CategoryCardAspect.R_4_5,
  sortBy: CategorySortBy.SORT,
  columns: 3,
  showDescription: true,
  showArrow: true,
  showOverlay: true,
  title: '分类一览',
  subtitle: '按品类探索盆景，寻觅心仪之选',
  eyebrow: '分类导览',
};

@Injectable()
export class CategoriesLayoutService {
  private readonly logger = new Logger(CategoriesLayoutService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 读取分类页布局配置
   * 未配置时返回默认值
   */
  async getConfig(): Promise<CategoriesLayoutConfigDto> {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key: CATEGORIES_LAYOUT_KEY },
    });
    if (!setting) {
      return { ...DEFAULT_CATEGORIES_LAYOUT };
    }
    try {
      const parsed = JSON.parse(setting.value) as Partial<CategoriesLayoutConfigDto>;
      // 过滤 null/undefined 值，避免覆盖默认值（历史脏数据兼容）
      const cleaned: Partial<CategoriesLayoutConfigDto> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (v !== null && v !== undefined) {
          (cleaned as Record<string, unknown>)[k] = v;
        }
      }
      // 合并默认值，避免字段缺失（增量升级兼容）
      return { ...DEFAULT_CATEGORIES_LAYOUT, ...cleaned };
    } catch {
      this.logger.warn(`分类页布局配置解析失败，回退默认值`);
      return { ...DEFAULT_CATEGORIES_LAYOUT };
    }
  }

  /**
   * 更新分类页布局配置
   * 事务化 upsert，校验由 DTO class-validator 保证
   * 返回数据库回写值，保证返回内容与持久化内容一致
   */
  async updateConfig(
    config: CategoriesLayoutConfigDto,
  ): Promise<CategoriesLayoutConfigDto> {
    await this.prisma.siteSetting.upsert({
      where: { key: CATEGORIES_LAYOUT_KEY },
      update: { value: JSON.stringify(config) },
      create: { key: CATEGORIES_LAYOUT_KEY, value: JSON.stringify(config) },
    });
    this.logger.log(
      `✅ 更新分类页布局配置：layout=${config.layout}, columns=${config.columns}, aspect=${config.aspect}`,
    );
    // 重新读取以保证返回内容与库中一致
    return this.getConfig();
  }

  /**
   * 重置为默认配置
   */
  async resetConfig(): Promise<CategoriesLayoutConfigDto> {
    await this.prisma.siteSetting.upsert({
      where: { key: CATEGORIES_LAYOUT_KEY },
      update: { value: JSON.stringify(DEFAULT_CATEGORIES_LAYOUT) },
      create: {
        key: CATEGORIES_LAYOUT_KEY,
        value: JSON.stringify(DEFAULT_CATEGORIES_LAYOUT),
      },
    });
    this.logger.log('✅ 已重置分类页布局配置为默认值');
    return { ...DEFAULT_CATEGORIES_LAYOUT };
  }
}
