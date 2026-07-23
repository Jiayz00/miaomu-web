import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
      description:
        '一株历经百年风霜的黑松盆景，枝干苍劲有力，针叶密集翠绿，是松柏盆景中的精品。整树造型采用悬崖式，呈现自然之力。',
      price: 18800,
      stock: 1,
      origin: '江苏扬州',
      year: 2024,
      treeAge: 100,
      height: 65,
      width: 80,
      isFeatured: true,
      categoryId: categories[0].id,
    },
    {
      name: '五针松造型',
      slug: 'wu-zhen-song-zao-xing',
      description:
        '日本五针松，经过多年精心蟠扎造型，层次分明，枝叶如云。适合陈列于书房、茶室。',
      price: 6800,
      stock: 3,
      origin: '浙江金华',
      year: 2023,
      treeAge: 25,
      height: 45,
      width: 55,
      isFeatured: false,
      categoryId: categories[0].id,
    },
    // 杂木类
    {
      name: '榔榆古桩',
      slug: 'lang-yu-gu-zhuang',
      description:
        '采自山野的榔榆古桩，树皮斑驳如龙鳞，根盘稳健，是杂木类盆景的代表作品。',
      price: 12800,
      stock: 1,
      origin: '湖北黄陂',
      year: 2024,
      treeAge: 60,
      height: 70,
      width: 65,
      isFeatured: true,
      categoryId: categories[1].id,
    },
    {
      name: '雀梅斜干式',
      slug: 'que-mei-xie-gan-shi',
      description:
        '雀梅斜干式盆景，主干倾斜有致，枝叶层次分明，秋季新芽鲜红，极具观赏价值。',
      price: 4200,
      stock: 5,
      origin: '江苏苏州',
      year: 2023,
      treeAge: 30,
      height: 50,
      width: 60,
      isFeatured: false,
      categoryId: categories[1].id,
    },
    // 花果类
    {
      name: '老桩石榴',
      slug: 'lao-zhuang-shi-liu',
      description:
        '老桩石榴盆景，初夏红花似火，秋季硕果累累。树干古朴苍劲，是花果盆景中的佳品。',
      price: 5600,
      stock: 2,
      origin: '山东枣庄',
      year: 2024,
      treeAge: 40,
      height: 60,
      width: 70,
      isFeatured: true,
      categoryId: categories[2].id,
    },
    {
      name: '梅花临水式',
      slug: 'mei-hua-lin-shui-shi',
      description:
        '梅花临水式盆景，枝条横斜临水，寒冬腊月花开满树，香气袭人。中国传统文化中的高洁象征。',
      price: 8800,
      stock: 1,
      origin: '浙江杭州',
      year: 2023,
      treeAge: 35,
      height: 55,
      width: 75,
      isFeatured: false,
      categoryId: categories[2].id,
    },
    // 山水盆景
    {
      name: '青绿山水',
      slug: 'qing-lv-shan-shui',
      description:
        '青绿山水盆景以英石为材，配以小型植物，再现千里江山之景。摆放于案头，意境深远。',
      price: 3200,
      stock: 4,
      origin: '广东英德',
      year: 2024,
      isFeatured: true,
      categoryId: categories[3].id,
    },
    {
      name: '渔舟小景',
      slug: 'yu-zhou-xiao-jing',
      description:
        '以龟纹石为主材，配以小船、人物配件，营造江南水乡渔舟唱晚之景，富有诗情画意。',
      price: 2600,
      stock: 6,
      origin: '湖南长沙',
      year: 2023,
      isFeatured: false,
      categoryId: categories[3].id,
    },
  ];

  for (let i = 0; i < bonsais.length; i++) {
    const b = bonsais[i];
    const created = await prisma.bonsai.upsert({
      where: { slug: b.slug },
      update: {},
      create: {
        ...b,
        price: b.price,
        images: {
          create: [
            {
              url: `https://picsum.photos/seed/bonsai${i + 1}/800/600`,
              isMain: true,
              sort: 0,
            },
            {
              url: `https://picsum.photos/seed/bonsai${i + 1}b/800/600`,
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
