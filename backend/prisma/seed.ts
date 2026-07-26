import { PrismaClient, Role, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  DEFAULT_HOMEPAGE_SECTIONS,
  normalizeStaleImagePaths,
  // SettingsService 内部用 DEFAULT_LAYOUTS 维护 collection/detail 默认配置，
  // 但该常量为模块私有，不导出。这里通过显式定义保证种子脚本自包含。
} from '../src/modules/settings/settings.service';

/**
 * collection / detail 默认布局
 * 与 settings.service.ts 中的 DEFAULT_LAYOUTS.collection / DEFAULT_LAYOUTS.detail 保持一致
 * 修改时需同步两端（避免循环导入，种子脚本显式重复定义）
 */
const DEFAULT_COLLECTION_SECTIONS = [
  {
    id: 'collection-banner-default',
    type: 'banner',
    title: '盆景收藏',
    subtitle: '于方寸之间，寻觅属于您的那一株。',
    visible: true,
    order: 1,
    config: {
      image:
        'https://images.unsplash.com/photo-1524598171347-833e3329d8ab?auto=format&fit=crop&w=1920&q=80',
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
];

const DEFAULT_DETAIL_SECTIONS = [
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
];

/**
 * 种子数据脚本
 * - 创建管理员账号
 * - 创建 4 个分类
 * - 创建 8 个示例盆景（每个分类 2 个）
 *
 * 运行方式：npm run prisma:seed
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 开始生成种子数据...');

  // 1. 创建管理员账号
  //    生产环境强制注入 ADMIN_DEFAULT_PASSWORD（在 configuration.ts 中校验）
  //    种子脚本使用 12 轮 bcrypt（与生产环境一致）
  //    脱敏设计：管理员用户名/邮箱/密码均通过环境变量注入，不硬编码
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123456';
  if (!adminPassword || adminPassword.length < 10) {
    console.warn('⚠️ ADMIN_DEFAULT_PASSWORD 长度不足 10 位，建议设置强密码');
  }
  const bcryptRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
  const hashedPassword = await bcrypt.hash(adminPassword, bcryptRounds);

  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      role: Role.ADMIN,
      status: 1,
    },
  });
  console.log(`✅ 管理员账号: ${admin.username} / ${admin.email}`);

  // 1.1 可选：创建第二个管理员账号（通过环境变量）
  //    部署时设置 ADMIN2_USERNAME / ADMIN2_PASSWORD / ADMIN2_EMAIL 即可创建
  //    使用 upsert 保证幂等：已存在则不重置密码
  const admin2Username = process.env.ADMIN2_USERNAME;
  const admin2Password = process.env.ADMIN2_PASSWORD;
  const admin2Email = process.env.ADMIN2_EMAIL || 'admin2@example.com';
  if (admin2Username && admin2Password) {
    const admin2Hashed = await bcrypt.hash(admin2Password, bcryptRounds);
    const admin2 = await prisma.user.upsert({
      where: { username: admin2Username },
      update: {},
      create: {
        username: admin2Username,
        email: admin2Email,
        password: admin2Hashed,
        role: Role.ADMIN,
        status: 1,
      },
    });
    console.log(`✅ 管理员账号 2: ${admin2.username} / ${admin2.email}`);
  }

  // 2. 创建 4 个分类
  const categories = await Promise.all(
    [
      {
        name: '松柏类',
        slug: 'song-bai',
        description: '以松、柏为主的盆景，造型苍劲古朴，四季常青。',
        sort: 1,
      },
      {
        name: '杂木类',
        slug: 'za-mu',
        description: '杂木类盆景包含榔榆、雀梅、三角枫等，形态多变。',
        sort: 2,
      },
      {
        name: '花果类',
        slug: 'hua-guo',
        description: '以观花、观果为主，如梅花、石榴、紫藤等。',
        sort: 3,
      },
      {
        name: '山水盆景',
        slug: 'shan-shui',
        description: '以山石、水景为主体，表现自然山水之美。',
        sort: 4,
      },
    ].map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        update: {},
        create: c,
      }),
    ),
  );
  console.log(`✅ 创建 ${categories.length} 个分类`);

  // 3. 创建 8 个示例盆景（每分类 2 个）
  const bonsais = [
    // 松柏类
    {
      name: '百年黑松',
      slug: 'bai-nian-hei-song',
      catalogNumber: 'PJ-2024-001',
      description:
        '一株历经百年风霜的黑松盆景，枝干苍劲有力，针叶密集翠绿，是松柏盆景中的精品。整树造型采用悬崖式，呈现自然之力。',
      artisticDescription:
        '此黑松主干扭转遒劲，皮层龟裂如龙鳞，枝片层次分明。树冠呈不等边三角形，左侧长枝探出，如迎风而立。整体气韵苍古雄健，又不失灵动之势，堪称松柏盆景之典范。',
      era: '当代',
      material: '黑松',
      potDescription: '宜兴紫砂深筒盆，赭褐色，与黑松苍劲气质相得益彰',
      canopyWidth: 85,
      dimensions: '高65cm×宽80cm×冠85cm',
      provenance: '出自扬州盆景世家，经三代人养护造型，曾入藏私人园林十余年',
      exhibitions: [
        { name: '扬州盆景艺术双年展', year: 2022, location: '江苏扬州' },
        { name: '长三角盆景精品邀请展', year: 2024, location: '上海' },
      ],
      price: 18800,
      stock: 1,
      origin: '江苏扬州',
      year: 2024,
      treeAge: 100,
      height: 65,
      width: 80,
      isFeatured: true,
      categoryId: categories[0].id,
      mainImage: '/images/bonsais/welcome-pine.jpg',
    },
    {
      name: '五针松造型',
      slug: 'wu-zhen-song-zao-xing',
      catalogNumber: 'PJ-2024-002',
      description:
        '日本五针松，经过多年精心蟠扎造型，层次分明，枝叶如云。适合陈列于书房、茶室。',
      artisticDescription:
        '五针松针叶短簇苍翠，枝条水平展开如云层叠。树姿端庄典雅，叶色四季常青，是文人书房中不可多得的清供。',
      era: '当代',
      material: '五针松',
      potDescription: '景德镇青花瓷盆，浅椭圆形，衬托松针青翠',
      canopyWidth: 58,
      dimensions: '高45cm×宽55cm×冠58cm',
      provenance: '引种自日本高松，经国内匠人十余年复整造型',
      exhibitions: [{ name: '全国松柏盆景邀请展', year: 2023, location: '浙江金华' }],
      price: 6800,
      stock: 3,
      origin: '浙江金华',
      year: 2023,
      treeAge: 25,
      height: 45,
      width: 55,
      isFeatured: false,
      categoryId: categories[0].id,
      mainImage: '/images/bonsais/cliff-cypress.jpg',
    },
    // 杂木类
    {
      name: '榔榆古桩',
      slug: 'lang-yu-gu-zhuang',
      catalogNumber: 'PJ-2024-003',
      description:
        '采自山野的榔榆古桩，树皮斑驳如龙鳞，根盘稳健，是杂木类盆景的代表作品。',
      artisticDescription:
        '榔榆古桩皮色灰褐，肌理苍古，根盘四展如爪伏地。主干短促而枝条舒展，春秋叶色变幻，极具山野之趣。',
      era: '当代',
      material: '榔榆',
      potDescription: '宜兴紫砂长方盆，古朴沉稳',
      canopyWidth: 68,
      dimensions: '高70cm×宽65cm×冠68cm',
      provenance: '采自湖北大别山余脉，经养桩八年方成今日之态',
      exhibitions: [{ name: '华中杂木盆景精品展', year: 2024, location: '湖北武汉' }],
      price: 12800,
      stock: 1,
      origin: '湖北黄陂',
      year: 2024,
      treeAge: 60,
      height: 70,
      width: 65,
      isFeatured: true,
      categoryId: categories[1].id,
      mainImage: '/images/bonsais/winter-plum.jpg',
    },
    {
      name: '雀梅斜干式',
      slug: 'que-mei-xie-gan-shi',
      catalogNumber: 'PJ-2024-004',
      description:
        '雀梅斜干式盆景，主干倾斜有致，枝叶层次分明，秋季新芽鲜红，极具观赏价值。',
      artisticDescription:
        '主干斜出盆面，势如临风。枝条细密，新叶红嫩，老叶苍翠，四时皆有可观。',
      era: '当代',
      material: '雀梅',
      potDescription: '宜兴紫砂椭圆盆，线条简练',
      canopyWidth: 62,
      dimensions: '高50cm×宽60cm×冠62cm',
      provenance: '苏州光福地区原生雀梅，经本地盆景艺人养护造型',
      exhibitions: [],
      price: 4200,
      stock: 5,
      origin: '江苏苏州',
      year: 2023,
      treeAge: 30,
      height: 50,
      width: 60,
      isFeatured: false,
      categoryId: categories[1].id,
      mainImage: '/images/bonsais/welcome-pine.jpg',
    },
    // 花果类
    {
      name: '老桩石榴',
      slug: 'lao-zhuang-shi-liu',
      catalogNumber: 'PJ-2024-005',
      description:
        '老桩石榴盆景，初夏红花似火，秋季硕果累累。树干古朴苍劲，是花果盆景中的佳品。',
      artisticDescription:
        '主干扭曲苍老，树皮剥落处露出木质纹理。春夏红花点缀，秋来硕果垂枝，寓意多子多福。',
      era: '当代',
      material: '石榴',
      potDescription: '景德镇窑变釉圆盆，色泽沉稳',
      canopyWidth: 72,
      dimensions: '高60cm×宽70cm×冠72cm',
      provenance: '山东枣庄石榴老桩，经嫁接造型培育',
      exhibitions: [{ name: '全国花果盆景展', year: 2024, location: '山东枣庄' }],
      price: 5600,
      stock: 2,
      origin: '山东枣庄',
      year: 2024,
      treeAge: 40,
      height: 60,
      width: 70,
      isFeatured: true,
      categoryId: categories[2].id,
      mainImage: '/images/bonsais/winter-plum.jpg',
    },
    {
      name: '梅花临水式',
      slug: 'mei-hua-lin-shui-shi',
      catalogNumber: 'PJ-2024-006',
      description:
        '梅花临水式盆景，枝条横斜临水，寒冬腊月花开满树，香气袭人。中国传统文化中的高洁象征。',
      artisticDescription:
        '主干横斜探出，如临水照影。枝干劲瘦，花苞繁密，凌寒独放，暗香浮动，尽显文人风骨。',
      era: '当代',
      material: '梅花',
      potDescription: '宜兴紫砂浅盆，配石 accent，营造临水意境',
      canopyWidth: 78,
      dimensions: '高55cm×宽75cm×冠78cm',
      provenance: '杭州超山梅园老桩，经造型培育',
      exhibitions: [{ name: '江南梅花盆景雅集', year: 2024, location: '浙江杭州' }],
      price: 8800,
      stock: 1,
      origin: '浙江杭州',
      year: 2023,
      treeAge: 35,
      height: 55,
      width: 75,
      isFeatured: false,
      categoryId: categories[2].id,
      mainImage: '/images/bonsais/cliff-cypress.jpg',
    },
    // 山水盆景
    {
      name: '青绿山水',
      slug: 'qing-lv-shan-shui',
      catalogNumber: 'PJ-2024-007',
      description:
        '青绿山水盆景以英石为材，配以小型植物，再现千里江山之景。摆放于案头，意境深远。',
      artisticDescription:
        '英石峰峦叠嶂，苔藓点染其间，山脚微缩植物掩映。咫尺之间，可见高远之意，如一幅立体的青绿山水长卷。',
      era: '当代',
      material: '英石、六月雪',
      potDescription: '汉白玉浅水槽盆，水清石秀',
      canopyWidth: 50,
      dimensions: '长60cm×宽35cm×高40cm',
      provenance: '广东英德英石精选，由山水盆景艺人组景',
      exhibitions: [{ name: '岭南山水盆景艺术展', year: 2024, location: '广东广州' }],
      price: 3200,
      stock: 4,
      origin: '广东英德',
      year: 2024,
      treeAge: null,
      height: 40,
      width: 35,
      isFeatured: true,
      categoryId: categories[3].id,
      mainImage: '/images/bonsais/welcome-pine.jpg',
    },
    {
      name: '渔舟小景',
      slug: 'yu-zhou-xiao-jing',
      catalogNumber: 'PJ-2024-008',
      description:
        '以龟纹石为主材，配以小船、人物配件，营造江南水乡渔舟唱晚之景，富有诗情画意。',
      artisticDescription:
        '龟纹石层次错落，水面留白处点缀渔舟与蓑翁。静中有动，让人遥想烟波江上、暮归渔唱的江南诗意。',
      era: '当代',
      material: '龟纹石、小舟配件',
      potDescription: '紫砂椭圆水旱盆，一边山石、一边水景',
      canopyWidth: 45,
      dimensions: '长55cm×宽30cm×高35cm',
      provenance: '湖南长沙龟纹石配景，手工组景完成',
      exhibitions: [],
      price: 2600,
      stock: 6,
      origin: '湖南长沙',
      year: 2023,
      treeAge: null,
      height: 35,
      width: 30,
      isFeatured: false,
      categoryId: categories[3].id,
      mainImage: '/images/bonsais/cliff-cypress.jpg',
    },
  ];

  for (let i = 0; i < bonsais.length; i++) {
    const b = bonsais[i];
    const { mainImage, ...bonsaiData } = b;
    const created = await prisma.bonsai.upsert({
      where: { slug: b.slug },
      update: {},
      create: {
        ...bonsaiData,
        price: b.price,
        exhibitions: b.exhibitions ? (b.exhibitions as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        images: {
          create: [
            {
              url: mainImage,
              isMain: true,
              sort: 0,
            },
            {
              url: '/images/artisan-pruning.jpg',
              isMain: false,
              sort: 1,
            },
          ],
        },
      },
    });
    console.log(`  🌿 盆景 [${i + 1}] ${created.name} (slug: ${created.slug})`);
  }

  console.log(`✅ 创建 ${bonsais.length} 个示例盆景`);

  // 4. 初始化站点设置（幂等，已存在的不覆盖）
  //    SettingsModule.onModuleInit 也会做同样的事，但种子脚本兜底保证部署后立即可用
  const defaultSettings = [
    { key: 'phone', value: '+86 400-888-0000' },
    { key: 'email', value: 'contact@penjing.example.com' },
    { key: 'address', value: '江苏省苏州市姑苏区盆景园 88 号' },
    { key: 'wechat', value: '' },
    { key: 'weibo', value: '' },
    { key: 'show_phone', value: 'true' },
    { key: 'show_email', value: 'true' },
    { key: 'show_address', value: 'true' },
    { key: 'show_wechat', value: 'false' },
    { key: 'show_weibo', value: 'false' },
    { key: 'site_name', value: '盆景艺术 Penjing' },
    { key: 'site_description', value: '凝练自然之美，传承千年技艺。每一株盆景，皆是时间与匠心的结晶，于方寸之间见天地。' },
    { key: 'icp', value: '' },
  ];
  for (const s of defaultSettings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log(`✅ 初始化 ${defaultSettings.length} 项站点设置`);

  // 5. 初始化多页面默认布局（幂等，已存在的不覆盖）
  //    支持 3 个页面：homepage / collection / detail
  //    SettingsModule.onModuleInit 也会做同样的事，但种子脚本兜底保证部署后立即可用
  const layoutsToInit = [
    {
      key: 'homepage',
      sections: DEFAULT_HOMEPAGE_SECTIONS,
      isActive: true,
      label: '主页（5 个区块）',
    },
    {
      key: 'collection',
      sections: DEFAULT_COLLECTION_SECTIONS,
      isActive: false,
      label: '盆景收藏页（2 个区块）',
    },
    {
      key: 'detail',
      sections: DEFAULT_DETAIL_SECTIONS,
      isActive: false,
      label: '藏品详情页（1 个区块）',
    },
  ] as const;

  for (const layout of layoutsToInit) {
    const existing = await prisma.siteLayout.findUnique({
      where: { key: layout.key },
    });
    if (!existing) {
      await prisma.siteLayout.create({
        data: {
          key: layout.key,
          sections: layout.sections as unknown as Prisma.InputJsonValue,
          isActive: layout.isActive,
        },
      });
      console.log(`✅ 创建默认布局 [${layout.key}] - ${layout.label}`);
    } else {
      // 迁移历史图片路径（如 /design-assets/ → /images/），避免旧数据 404
      const { result: normalizedSections, changed } = normalizeStaleImagePaths(
        existing.sections as unknown as typeof layout.sections,
      );
      if (changed) {
        await prisma.siteLayout.update({
          where: { key: layout.key },
          data: { sections: normalizedSections as unknown as Prisma.InputJsonValue },
        });
        console.log(`✅ 迁移布局 [${layout.key}] 中的历史图片路径`);
      } else {
        console.log(`ℹ️ 布局 [${layout.key}] 已存在，跳过创建`);
      }
    }
  }

  console.log('🎉 种子数据生成完成');
}

main()
  .catch((err) => {
    console.error('❌ 种子数据生成失败:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
