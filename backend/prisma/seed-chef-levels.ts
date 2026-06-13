/**
 * 厨师等级定义种子脚本
 *
 * 用法: npx ts-node prisma/seed-chef-levels.ts
 * 或通过 admin API GET /admin/chef-levels/seed 触发
 *
 * 使用 upsert 确保幂等，可重复执行。
 */
import { PrismaClient } from '@prisma/client';
import { CHEF_LEVELS } from '@family-kitchen/shared';

const prisma = new PrismaClient();

interface ChefLevelSeed {
  key: string;
  title: string;
  emoji: string;
  minOrders: number;
  minAvgRating: number;
  sortOrder: number;
}

const LEVELS: ChefLevelSeed[] = CHEF_LEVELS.map((lv, idx) => ({
  key: lv.key,
  title: lv.title,
  emoji: lv.emoji,
  minOrders: lv.minOrders,
  minAvgRating: lv.minAvgRating,
  sortOrder: idx * 10,
}));

async function main() {
  console.log(`🌱 开始播种厨师等级定义 (${LEVELS.length} 个)...\n`);

  let created = 0;
  let skipped = 0;

  for (const level of LEVELS) {
    const result = await prisma.chefLevelDefinition.upsert({
      where: { key: level.key },
      update: {
        title: level.title,
        emoji: level.emoji,
        minOrders: level.minOrders,
        minAvgRating: level.minAvgRating,
        sortOrder: level.sortOrder,
      },
      create: {
        key: level.key,
        title: level.title,
        emoji: level.emoji,
        minOrders: level.minOrders,
        minAvgRating: level.minAvgRating,
        sortOrder: level.sortOrder,
      },
    });

    if ((result as any).createdAt === (result as any).updatedAt) {
      created++;
      console.log(`  ✅ 创建: ${level.emoji} ${level.title} (${level.key})`);
    } else {
      skipped++;
      console.log(`  ⏭️  跳过: ${level.emoji} ${level.title} (${level.key})`);
    }
  }

  console.log(`\n🎉 完成！创建 ${created} 个，跳过 ${skipped} 个`);
}

main()
  .catch((e) => {
    console.error('❌ 厨师等级定义播种失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
