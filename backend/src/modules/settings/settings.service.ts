import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SiteSectionDto,
  SUPPORTED_LAYOUT_KEYS,
  type SupportedLayoutKey,
} from './dto/update-site-layout.dto';
import {
  CategoriesLayoutConfigDto,
  CategoryCardAspect,
  CategoryLayoutMode,
  CategorySortBy,
} from './dto/update-categories-layout.dto';
import {
  SITE_ASSET_CATEGORIES,
  type SiteAssetCategory,
  type SiteAssetDto,
  type SiteAssetListResponseDto,
} from './dto/site-asset.dto';

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

/**
 * 历史图片路径迁移映射
 * 早期版本将设计稿图片放在 /design-assets/，后统一迁移到 /images/。
 * 该映射用于在启动/种子阶段自动修正数据库中残留的旧路径，避免 404。
 */
export const STALE_IMAGE_PATH_MAP: Record<string, string> = {
  '/design-assets/image_0_yi19x4.jpg': '/images/hero-penjing-garden.jpg',
  '/design-assets/image_1_yi19x4.jpg': '/images/bonsais/welcome-pine.jpg',
  '/design-assets/image_2_yi19x4.jpg': '/images/bonsais/cliff-cypress.jpg',
  '/design-assets/image_3_yi19x4.jpg': '/images/bonsais/winter-plum.jpg',
  '/design-assets/image_4_yi19x4.jpg': '/images/artisan-pruning.jpg',
  '/design-assets/image_5_yi19x4.jpg': '/images/serene-garden.jpg',
};

/**
 * 递归替换 JSON 中的历史图片路径
 * 返回替换后的新对象（不修改原对象）以及是否发生过替换
 */
export function normalizeStaleImagePaths<T>(value: T): { result: T; changed: boolean } {
  let changed = false;

  function walk<V>(v: V): V {
    if (typeof v === 'string') {
      const replacement = STALE_IMAGE_PATH_MAP[v];
      if (replacement) {
        changed = true;
        return replacement as unknown as V;
      }
      return v;
    }
    if (Array.isArray(v)) {
      return v.map(walk) as unknown as V;
    }
    if (v !== null && typeof v === 'object') {
      const next: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(v as Record<string, unknown>)) {
        next[key] = walk(val);
      }
      return next as unknown as V;
    }
    return v;
  }

  const result = walk(value);
  return { result, changed };
}

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
      heroImage: '/images/hero-penjing-garden.jpg',
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
      image: '/images/artisan-pruning.jpg',
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

/**
 * 各布局 key 的默认区块配置
 * 站点编辑器支持 3 个页面：homepage / collection / detail
 * 新增 key 时需在此追加默认配置，并在 SUPPORTED_LAYOUT_KEYS 中注册
 */
const DEFAULT_LAYOUTS: Record<SupportedLayoutKey, SiteSectionDto[]> = {
  homepage: DEFAULT_HOMEPAGE_SECTIONS,

  // 盆景收藏列表页（/bonsais）：横幅 + 筛选提示 + 网格
  collection: [
    {
      id: 'collection-banner-default',
      type: 'banner',
      title: '盆景收藏',
      subtitle: '于方寸之间，寻觅属于您的那一株。',
      visible: true,
      order: 1,
      config: {
        image: '/images/serene-garden.jpg',
        eyebrow: '当代盆景策展',
        title: '盆景收藏',
        subtitle: '于方寸之间，寻觅属于您的那一株。',
        height: 60,
        align: 'center',
        overlay: true,
        overlayOpacity: 45,
      },
    },
    {
      id: 'collection-intro-default',
      type: 'text',
      title: '关于此苑',
      subtitle: '',
      visible: true,
      order: 2,
      config: {
        content:
          '此苑汇集本馆珍藏盆景，按品类、产地、树龄分门别类。可借由筛选与排序，于众多藏品中觅得心仪之选；亦可直达藏品详情页，了解每一株的来龙与去脉。',
      },
    },
  ],

  // 藏品详情页（/bonsais/:slug）：默认仅一个 text 区块说明
  // 实际详情页内容由 Bonsai 数据驱动，此布局仅用于页面顶部自定义内容
  detail: [
    {
      id: 'detail-intro-default',
      type: 'text',
      title: '藏品故事',
      subtitle: '',
      visible: true,
      order: 1,
      config: {
        content:
          '每一株盆景皆承载独特故事。于此页可呈现匠人手记、养护建议与历史源流，让访客在欣赏之外，更深入了解每一件藏品的来龙去脉。',
      },
    },
  ],
};

/**
 * 预览 token 的 JWT 载荷
 * sub: 'preview' 用于区分普通用户 JWT
 * key: 要预览的布局 key
 */
interface PreviewTokenPayload {
  sub: 'preview';
  key: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

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
   * 初始化默认布局（首次启动时调用，幂等）
   * 为所有 SUPPORTED_LAYOUT_KEYS 创建默认记录；已存在的 key 不会被覆盖
   * 同时确保 homepage 始终激活（用于前台 SSR）
   */
  async initDefaultLayout(): Promise<void> {
    for (const key of SUPPORTED_LAYOUT_KEYS) {
      const existing = await this.prisma.siteLayout.findUnique({ where: { key } });
      if (existing) {
        // 迁移历史图片路径（如 /design-assets/ → /images/），避免旧数据 404
        const { result: normalizedSections, changed } = normalizeStaleImagePaths(
          existing.sections as unknown as SiteSectionDto[],
        );
        if (changed) {
          await this.prisma.siteLayout.update({
            where: { key },
            data: { sections: normalizedSections as unknown as Prisma.InputJsonValue },
          });
          this.logger.log(`✅ 已迁移布局 [${key}] 中的历史图片路径`);
        }
        continue;
      }

      const defaultSections = DEFAULT_LAYOUTS[key];
      await this.prisma.siteLayout.create({
        data: {
          key,
          sections: defaultSections as unknown as Prisma.InputJsonValue,
          // 仅 homepage 默认激活；collection/detail 默认不激活（由前端按需启用）
          isActive: key === 'homepage',
        },
      });
      this.logger.log(`✅ 已创建默认布局 [${key}]`);
    }

    // 确保 homepage 始终有激活记录
    const activeHomepage = await this.prisma.siteLayout.findFirst({
      where: { key: 'homepage', isActive: true },
    });
    if (!activeHomepage) {
      await this.prisma.siteLayout.updateMany({
        where: { key: 'homepage' },
        data: { isActive: true },
      });
      this.logger.log('✅ 已激活默认 homepage 布局');
    }
  }

  /**
   * 公开接口：获取指定 key 当前激活的布局配置
   * 用于前台 SSR 渲染主页/收藏页/详情页
   * 仅返回已发布版本（sections），不返回草稿
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
   * 管理员接口：获取全部布局列表（含草稿状态摘要）
   */
  async getAllLayouts(): Promise<
    Array<{
      id: number;
      key: string;
      sections: SiteSectionDto[];
      isActive: boolean;
      hasDraft: boolean;
      draftUpdatedAt: Date | null;
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
      hasDraft: l.draftSections !== null,
      draftUpdatedAt: l.draftUpdatedAt,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }));
  }

  /**
   * 管理员接口：获取指定 key 的布局（用于编辑回显）
   * 同时返回已发布 sections 与草稿 draftSections（若有）
   */
  async getLayoutByKey(key: string): Promise<{
    id: number;
    key: string;
    sections: SiteSectionDto[];
    draftSections: SiteSectionDto[] | null;
    draftUpdatedAt: Date | null;
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
      draftSections: layout.draftSections
        ? (layout.draftSections as unknown as SiteSectionDto[])
        : null,
      draftUpdatedAt: layout.draftUpdatedAt,
      isActive: layout.isActive,
      createdAt: layout.createdAt,
      updatedAt: layout.updatedAt,
    };
  }

  /**
   * 管理员接口：获取指定 key 的草稿（编辑器自动保存后拉取）
   * 若无草稿（draftSections 为 null），返回已发布 sections 作为初始草稿
   * 这样新进入编辑器时总有内容可编辑
   */
  async getDraftLayout(key: string): Promise<{
    key: string;
    sections: SiteSectionDto[];
    draftUpdatedAt: Date | null;
    hasUnpublishedChanges: boolean;
    isActive: boolean;
  } | null> {
    const layout = await this.prisma.siteLayout.findUnique({ where: { key } });
    if (!layout) return null;

    const published = (layout.sections as unknown as SiteSectionDto[]) ?? [];
    const draft = layout.draftSections
      ? (layout.draftSections as unknown as SiteSectionDto[])
      : null;

    return {
      key: layout.key,
      sections: draft ?? published,
      draftUpdatedAt: layout.draftUpdatedAt,
      hasUnpublishedChanges: draft !== null,
      isActive: layout.isActive,
    };
  }

  /**
   * 管理员接口：保存草稿（自动保存 / 手动保存草稿）
   * 仅写入 draftSections + draftUpdatedAt，不影响已发布 sections
   */
  async updateDraftLayout(
    key: string,
    sections: SiteSectionDto[],
  ): Promise<{
    key: string;
    draftUpdatedAt: Date;
  }> {
    const sorted = [...sections].sort((a, b) => a.order - b.order);

    // upsert：若 key 不存在则创建（draftSections + sections 都设为相同内容，
    // sections 留空创建会破坏前台渲染，故复用 sorted 作为初始已发布版本）
    const existing = await this.prisma.siteLayout.findUnique({ where: { key } });
    if (!existing) {
      await this.prisma.siteLayout.create({
        data: {
          key,
          sections: sorted as unknown as Prisma.InputJsonValue,
          draftSections: sorted as unknown as Prisma.InputJsonValue,
          draftUpdatedAt: new Date(),
          isActive: key === 'homepage', // 仅 homepage 默认激活
        },
      });
    } else {
      await this.prisma.siteLayout.update({
        where: { key },
        data: {
          draftSections: sorted as unknown as Prisma.InputJsonValue,
          draftUpdatedAt: new Date(),
        },
      });
    }

    const refreshed = await this.prisma.siteLayout.findUnique({ where: { key } });
    this.logger.log(
      `✅ 保存草稿 [${key}]，共 ${sorted.length} 个区块，${refreshed!.draftUpdatedAt!.toISOString()}`,
    );
    return {
      key,
      draftUpdatedAt: refreshed!.draftUpdatedAt!,
    };
  }

  /**
   * 管理员接口：发布草稿
   * 将 draftSections 复制到 sections（已发布版本），可选清空草稿
   * 若无草稿（draftSections 为 null），抛出 NotFoundException
   */
  async publishLayout(
    key: string,
    clearDraft = true,
  ): Promise<{
    id: number;
    key: string;
    sections: SiteSectionDto[];
    draftSections: SiteSectionDto[] | null;
    isActive: boolean;
  }> {
    const layout = await this.prisma.siteLayout.findUnique({ where: { key } });
    if (!layout) {
      throw new NotFoundException(`布局 [${key}] 不存在`);
    }
    if (layout.draftSections === null) {
      throw new NotFoundException(`布局 [${key}] 无草稿可发布`);
    }

    const draftSections = layout.draftSections as unknown as SiteSectionDto[];

    await this.prisma.siteLayout.update({
      where: { key },
      data: {
        sections: layout.draftSections,
        draftSections: clearDraft ? Prisma.JsonNull : undefined,
        draftUpdatedAt: clearDraft ? null : undefined,
        // 发布即激活（保证前台能渲染到新版本）
        isActive: true,
      },
    });

    this.logger.log(
      `✅ 发布布局 [${key}]，共 ${draftSections.length} 个区块，${clearDraft ? '已清空草稿' : '保留草稿'}`,
    );

    const refreshed = await this.prisma.siteLayout.findUnique({ where: { key } });
    return {
      id: refreshed!.id,
      key: refreshed!.key,
      sections: (refreshed!.sections as unknown as SiteSectionDto[]) ?? [],
      draftSections: refreshed!.draftSections
        ? (refreshed!.draftSections as unknown as SiteSectionDto[])
        : null,
      isActive: refreshed!.isActive,
    };
  }

  /**
   * 管理员接口：丢弃草稿
   * 清空 draftSections，回退到已发布 sections
   */
  async discardDraft(key: string): Promise<{
    id: number;
    key: string;
    sections: SiteSectionDto[];
    draftSections: null;
    isActive: boolean;
  }> {
    const layout = await this.prisma.siteLayout.findUnique({ where: { key } });
    if (!layout) {
      throw new NotFoundException(`布局 [${key}] 不存在`);
    }
    if (layout.draftSections === null) {
      // 无草稿，幂等返回
      return {
        id: layout.id,
        key: layout.key,
        sections: (layout.sections as unknown as SiteSectionDto[]) ?? [],
        draftSections: null,
        isActive: layout.isActive,
      };
    }

    await this.prisma.siteLayout.update({
      where: { key },
      data: {
        draftSections: Prisma.JsonNull,
        draftUpdatedAt: null,
      },
    });

    this.logger.log(`✅ 丢弃草稿 [${key}]，回退到已发布版本`);

    const refreshed = await this.prisma.siteLayout.findUnique({ where: { key } });
    return {
      id: refreshed!.id,
      key: refreshed!.key,
      sections: (refreshed!.sections as unknown as SiteSectionDto[]) ?? [],
      draftSections: null,
      isActive: refreshed!.isActive,
    };
  }

  /**
   * 管理员接口：更新指定 key 的【已发布】布局 sections
   * 直接覆盖已发布版本，不经过草稿流程。
   * 站点编辑器应优先使用 updateDraftLayout + publishLayout 工作流。
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
        isActive: key === 'homepage',
      },
    });

    // 若该 key 没有任何激活记录，自动激活（保证前台始终有布局可用）
    const activeCount = await this.prisma.siteLayout.count({
      where: { key, isActive: true },
    });
    if (activeCount === 0) {
      await this.prisma.siteLayout.update({
        where: { id: layout.id },
        data: { isActive: true },
      });
    }

    this.logger.log(`✅ 更新布局 [${key}]，共 ${sorted.length} 个区块`);
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
   * 由于 key 唯一约束，每个 key 仅一条记录，此处仅切换该记录的 isActive
   * 不影响其他 key 的激活状态（多页面可同时激活）
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

    await this.prisma.siteLayout.update({
      where: { key },
      data: { isActive: true },
    });

    this.logger.log(`✅ 已激活布局 [${key}]`);
    return { id: exists.id, key, isActive: true };
  }

  /**
   * 管理员接口：重置指定 key 的布局为默认配置
   * 支持所有 SUPPORTED_LAYOUT_KEYS（homepage / collection / detail）
   * 同时清空草稿
   */
  async resetLayout(key: string): Promise<{
    id: number;
    key: string;
    sections: SiteSectionDto[];
    isActive: boolean;
  }> {
    if (!SUPPORTED_LAYOUT_KEYS.includes(key as SupportedLayoutKey)) {
      throw new NotFoundException(
        `不支持重置布局 [${key}]，仅支持: ${SUPPORTED_LAYOUT_KEYS.join(', ')}`,
      );
    }

    const defaultSections = DEFAULT_LAYOUTS[key as SupportedLayoutKey];

    const layout = await this.prisma.siteLayout.upsert({
      where: { key },
      update: {
        sections: defaultSections as unknown as Prisma.InputJsonValue,
        draftSections: Prisma.JsonNull,
        draftUpdatedAt: null,
      },
      create: {
        key,
        sections: defaultSections as unknown as Prisma.InputJsonValue,
        isActive: key === 'homepage',
      },
    });

    this.logger.log(`✅ 已重置布局 [${key}] 为默认配置`);
    return {
      id: layout.id,
      key: layout.key,
      sections: (layout.sections as unknown as SiteSectionDto[]) ?? [],
      isActive: layout.isActive,
    };
  }

  // ============ 草稿预览（Preview Token）============

  /**
   * 管理员接口：生成草稿预览 token
   * 使用 JWT 签名（stateless），默认 10 分钟有效，最长 30 分钟
   * 前端用此 token 打开 /preview/layout/:key?token=xxx 在新窗口预览草稿
   */
  async createPreviewToken(
    key: string,
    ttlMinutes = 10,
  ): Promise<{
    previewUrl: string;
    token: string;
    expiresAt: number;
  }> {
    const exists = await this.prisma.siteLayout.findUnique({ where: { key } });
    if (!exists) {
      throw new NotFoundException(`布局 [${key}] 不存在`);
    }

    const payload: PreviewTokenPayload = { sub: 'preview', key };
    const secret = this.configService.get<string>('jwt.secret');

    const token = this.jwtService.sign(payload, {
      secret,
      expiresIn: `${ttlMinutes}m`,
    });

    // 解析过期时间（jwt.sign 不返回 exp，需手动计算）
    const expiresAt = Math.floor(Date.now() / 1000) + ttlMinutes * 60;

    this.logger.log(
      `✅ 生成预览 token [${key}]，有效期 ${ttlMinutes} 分钟`,
    );

    return {
      previewUrl: `/preview/layout/${key}?token=${token}`,
      token,
      expiresAt,
    };
  }

  /**
   * 公开接口（带 token 校验）：通过预览 token 获取草稿内容
   * 用于 /preview/layout/:key 路由，新窗口预览编辑中的草稿
   *
   * 安全设计：
   * - token 必须为有效 JWT 签名（防伪造）
   * - sub 必须为 'preview'（防复用普通用户 token）
   * - token 中的 key 必须与请求的 key 一致（防越权预览其他页面）
   * - token 有过期时间（默认 10 分钟）
   */
  async getLayoutByPreviewToken(
    key: string,
    token: string,
  ): Promise<{
    key: string;
    sections: SiteSectionDto[];
    isPreview: true;
  } | null> {
    const secret = this.configService.get<string>('jwt.secret');

    let payload: PreviewTokenPayload;
    try {
      payload = this.jwtService.verify<PreviewTokenPayload>(token, { secret });
    } catch {
      throw new UnauthorizedException('预览 token 无效或已过期');
    }

    if (payload.sub !== 'preview' || payload.key !== key) {
      throw new UnauthorizedException('预览 token 与请求的布局不匹配');
    }

    const layout = await this.prisma.siteLayout.findUnique({ where: { key } });
    if (!layout) return null;

    // 优先返回草稿；无草稿则返回已发布版本（预览已发布版本也无害）
    const sections = layout.draftSections
      ? (layout.draftSections as unknown as SiteSectionDto[])
      : (layout.sections as unknown as SiteSectionDto[]);

    return {
      key: layout.key,
      sections: sections ?? [],
      isPreview: true,
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

// ============ 站点资源（图集管理）============

/**
 * 上传后持久化元数据时使用的输入结构
 * 由 UploadService 在上传成功后构造并调用 createFromUpload
 */
export interface CreateSiteAssetInput {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  alt?: string | null;
  category?: SiteAssetCategory;
}

/**
 * 站点资源（图集）服务
 *
 * 设计：
 * - 上传成功后由 UploadService 调用 createFromUpload 持久化元数据
 * - 与 site_layouts.sections 解耦：sections.config 中的图片 URL 仅引用本表 url 字段
 * - 提供分页列表、按 ID 查询、更新 alt、删除（含磁盘文件可选清理）等 CRUD
 *
 * 注意：
 * - url 字段唯一约束；若同一 URL 重复写入，使用 upsert 幂等处理
 * - 删除资源时仅删除数据库记录，磁盘文件由调用方决定是否清理（避免误删被引用的图片）
 */
@Injectable()
export class SiteAssetService {
  private readonly logger = new Logger(SiteAssetService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 上传后写入元数据（幂等：URL 已存在则更新维度/大小等元数据）
   * 由 UploadService.uploadSingle / uploadMultiple / uploadVideo 调用
   */
  async createFromUpload(input: CreateSiteAssetInput): Promise<SiteAssetDto> {
    const category: SiteAssetCategory = input.category
      ?? (input.mimeType.startsWith('video/') ? 'video' : 'image');

    const asset = await this.prisma.siteAsset.upsert({
      where: { url: input.url },
      update: {
        filename: input.filename,
        mimeType: input.mimeType,
        size: input.size,
        width: input.width ?? null,
        height: input.height ?? null,
        duration: input.duration ?? null,
        category,
      },
      create: {
        url: input.url,
        filename: input.filename,
        mimeType: input.mimeType,
        size: input.size,
        width: input.width ?? null,
        height: input.height ?? null,
        duration: input.duration ?? null,
        alt: input.alt ?? null,
        category,
      },
    });

    this.logger.log(
      `✅ 记录资源元数据: ${asset.filename} (${category}, ${asset.size} bytes)`,
    );
    return this.toDto(asset);
  }

  /**
   * 分页查询图集列表
   * 支持按类别筛选；按 createdAt 降序排列（最新优先）
   * 同时返回该筛选条件下的总占用空间
   */
  async list(params: {
    category?: SiteAssetCategory;
    page?: number;
    pageSize?: number;
  }): Promise<SiteAssetListResponseDto> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 24));
    const skip = (page - 1) * pageSize;

    const where: Prisma.SiteAssetWhereInput = {};
    if (params.category && SITE_ASSET_CATEGORIES.includes(params.category)) {
      where.category = params.category;
    }

    const [items, total, totalSizeAgg] = await Promise.all([
      this.prisma.siteAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.siteAsset.count({ where }),
      this.prisma.siteAsset.aggregate({
        where,
        _sum: { size: true },
      }),
    ]);

    return {
      items: items.map((a) => this.toDto(a)),
      total,
      page,
      pageSize,
      totalSize: totalSizeAgg._sum.size ?? 0,
    };
  }

  /**
   * 按 ID 查询单个资源
   */
  async getById(id: number): Promise<SiteAssetDto | null> {
    const asset = await this.prisma.siteAsset.findUnique({ where: { id } });
    return asset ? this.toDto(asset) : null;
  }

  /**
   * 更新资源（目前仅允许更新 alt 替代文本）
   */
  async update(
    id: number,
    data: { alt?: string | null },
  ): Promise<SiteAssetDto> {
    const asset = await this.prisma.siteAsset.update({
      where: { id },
      data: { alt: data.alt ?? null },
    });
    this.logger.log(`✅ 更新资源 alt: id=${id}, alt="${data.alt ?? ''}"`);
    return this.toDto(asset);
  }

  /**
   * 删除资源记录（不清理磁盘文件，避免误删被引用的图片）
   * 返回被删除记录的 url，由调用方决定是否清理磁盘
   */
  async delete(id: number): Promise<{ id: number; url: string; filename: string }> {
    const asset = await this.prisma.siteAsset.delete({ where: { id } });
    this.logger.log(`✅ 删除资源记录: id=${id}, url=${asset.url}`);
    return { id: asset.id, url: asset.url, filename: asset.filename };
  }

  /**
   * 按 URL 查询（用于 UploadService 判断是否已记录）
   */
  async findByUrl(url: string): Promise<SiteAssetDto | null> {
    const asset = await this.prisma.siteAsset.findUnique({ where: { url } });
    return asset ? this.toDto(asset) : null;
  }

  /**
   * 将 Prisma 模型转换为 DTO
   */
  private toDto(asset: {
    id: number;
    url: string;
    filename: string;
    mimeType: string;
    size: number;
    width: number | null;
    height: number | null;
    duration: number | null;
    alt: string | null;
    category: string;
    createdAt: Date;
    updatedAt: Date;
  }): SiteAssetDto {
    return {
      id: asset.id,
      url: asset.url,
      filename: asset.filename,
      mimeType: asset.mimeType,
      size: asset.size,
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
      alt: asset.alt,
      category: asset.category as SiteAssetCategory,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }
}
