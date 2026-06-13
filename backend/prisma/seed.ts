/**
 * 模拟数据种子脚本
 *
 * 用法: npx prisma db seed
 * 或直接: npx ts-node prisma/seed.ts
 *
 * 创建:
 *  - 厨师等级定义 (5 个, upsert 幂等)
 *  - 成就徽章定义 (~55 个, upsert 幂等)
 *  - 2 个用户 (老公/老婆)
 *  - 1 个家庭 (couple)
 *  - 8 道菜谱
 *  - 3 个订单 (不同状态: cooking, served, completed)
 *  - 订单消息 (聊天记录)
 *  - 评价
 *  - 爱心币流水
 *  - 时间线条目
 */
import { PrismaClient } from '@prisma/client';
import { CHEF_LEVELS } from '@family-kitchen/shared';
import { BADGES } from './seed-badges';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始播种模拟数据...\n');

  // ── 1. 用户 ──────────────────────────────────────────────
  const husband = await prisma.user.create({
    data: {
      id: 'user_husband',
      nickname: '大厨老公',
      avatarUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Felix',
      gender: 'male',
      signature: '做饭是我最大的爱好',
    },
  });

  const wife = await prisma.user.create({
    data: {
      id: 'user_wife',
      nickname: '吃货老婆',
      avatarUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Aneka',
      gender: 'female',
      signature: '负责吃和点赞',
    },
  });

  console.log(`✅ 用户: ${husband.nickname}, ${wife.nickname}`);

  // ── 2. 家庭 ──────────────────────────────────────────────
  const family = await prisma.family.create({
    data: {
      id: 'family_demo',
      name: '甜蜜小厨房',
      relationType: 'couple',
      anniversaryDate: new Date('2023-02-14'),
      inviteCode: 'LOVE2024',
      inviteCodeExpiresAt: new Date('2027-12-31'),
      creatorUserId: husband.id,
      status: 'active',
    },
  });

  await prisma.familyMember.createMany({
    data: [
      { id: 'fm_husband', familyId: family.id, userId: husband.id, role: 'creator' },
      { id: 'fm_wife', familyId: family.id, userId: wife.id, role: 'member' },
    ],
  });

  // 设置 currentFamilyId
  await prisma.user.update({ where: { id: husband.id }, data: { currentFamilyId: family.id } });
  await prisma.user.update({ where: { id: wife.id }, data: { currentFamilyId: family.id } });

  console.log(`✅ 家庭: ${family.name}`);

  // ── 3. 菜谱 ──────────────────────────────────────────────
  const recipes = await Promise.all([
    prisma.recipe.create({
      data: {
        id: 'recipe_1',
        familyId: family.id,
        name: '番茄炒蛋',
        imageUrls: ['https://picsum.photos/seed/tomato-egg/400/300'],
        difficulty: 1,
        mealTags: ['lunch', 'dinner'],
        flavorTags: ['sweet', 'salty'],
        notes: '经典家常菜，百吃不厌',
        createdByUserId: husband.id,
        orderCount: 12,
        avgRating: 4.8,
      },
    }),
    prisma.recipe.create({
      data: {
        id: 'recipe_2',
        familyId: family.id,
        name: '红烧排骨',
        imageUrls: ['https://picsum.photos/seed/pork-ribs/400/300'],
        difficulty: 3,
        mealTags: ['dinner'],
        flavorTags: ['salty', 'sweet'],
        notes: '老婆最爱的一道菜',
        createdByUserId: husband.id,
        orderCount: 8,
        avgRating: 4.9,
      },
    }),
    prisma.recipe.create({
      data: {
        id: 'recipe_3',
        familyId: family.id,
        name: '清蒸鲈鱼',
        imageUrls: ['https://picsum.photos/seed/steamed-fish/400/300'],
        difficulty: 2,
        mealTags: ['dinner'],
        flavorTags: ['mild'],
        notes: '清淡鲜美，适合周末',
        createdByUserId: husband.id,
        orderCount: 5,
        avgRating: 4.5,
      },
    }),
    prisma.recipe.create({
      data: {
        id: 'recipe_4',
        familyId: family.id,
        name: '麻婆豆腐',
        imageUrls: ['https://picsum.photos/seed/mapo-tofu/400/300'],
        difficulty: 2,
        mealTags: ['lunch', 'dinner'],
        flavorTags: ['spicy', 'salty'],
        notes: '麻辣鲜香，下饭神器',
        createdByUserId: husband.id,
        orderCount: 10,
        avgRating: 4.7,
      },
    }),
    prisma.recipe.create({
      data: {
        id: 'recipe_5',
        familyId: family.id,
        name: '蛋炒饭',
        imageUrls: ['https://picsum.photos/seed/fried-rice/400/300'],
        difficulty: 1,
        mealTags: ['lunch', 'midnight'],
        flavorTags: ['salty'],
        notes: '简单快手，深夜首选',
        createdByUserId: wife.id,
        orderCount: 15,
        avgRating: 4.3,
      },
    }),
    prisma.recipe.create({
      data: {
        id: 'recipe_6',
        familyId: family.id,
        name: '酸辣土豆丝',
        imageUrls: ['https://picsum.photos/seed/potato-shreds/400/300'],
        difficulty: 1,
        mealTags: ['lunch', 'dinner'],
        flavorTags: ['spicy', 'sour'],
        createdByUserId: husband.id,
        orderCount: 7,
        avgRating: 4.4,
      },
    }),
    prisma.recipe.create({
      data: {
        id: 'recipe_7',
        familyId: family.id,
        name: '紫菜蛋花汤',
        imageUrls: ['https://picsum.photos/seed/seaweed-soup/400/300'],
        difficulty: 1,
        mealTags: ['lunch', 'dinner'],
        flavorTags: ['mild'],
        notes: '快手汤品，5分钟搞定',
        createdByUserId: wife.id,
        orderCount: 9,
        avgRating: 4.2,
      },
    }),
    prisma.recipe.create({
      data: {
        id: 'recipe_8',
        familyId: family.id,
        name: '可乐鸡翅',
        imageUrls: ['https://picsum.photos/seed/cola-wings/400/300'],
        difficulty: 2,
        mealTags: ['dinner'],
        flavorTags: ['sweet'],
        notes: '甜咸交融，谁都爱吃',
        createdByUserId: husband.id,
        orderCount: 6,
        avgRating: 4.6,
      },
    }),
  ]);

  console.log(`✅ 菜谱: ${recipes.length} 道`);

  // ── 4. 菜谱收藏 ──────────────────────────────────────────
  await prisma.recipeFavorite.createMany({
    data: [
      { recipeId: 'recipe_2', userId: wife.id },
      { recipeId: 'recipe_4', userId: wife.id },
      { recipeId: 'recipe_8', userId: wife.id },
      { recipeId: 'recipe_5', userId: husband.id },
    ],
  });

  console.log(`✅ 菜谱收藏: 4 条`);

  // ── 5. 订单 ──────────────────────────────────────────────
  // 订单 1: 烹饪中 (活跃)
  const order1 = await prisma.order.create({
    data: {
      id: 'order_1',
      familyId: family.id,
      customerUserId: wife.id,
      chefUserId: husband.id,
      status: 'cooking',
      expectedServeAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      customerNotes: '老公辛苦啦，不要太辣哦～',
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order1.id,
        recipeId: 'recipe_2',
        recipeSnapshot: {
          name: '红烧排骨',
          imageUrls: ['https://picsum.photos/seed/pork-ribs/400/300'],
          difficulty: 3,
        },
        sortOrder: 0,
      },
      {
        orderId: order1.id,
        recipeId: 'recipe_6',
        recipeSnapshot: {
          name: '酸辣土豆丝',
          imageUrls: ['https://picsum.photos/seed/potato-shreds/400/300'],
          difficulty: 1,
        },
        sortOrder: 1,
      },
    ],
  });

  // 订单消息 (聊天记录)
  await prisma.orderMessage.createMany({
    data: [
      {
        id: 'msg_1_1',
        orderId: order1.id,
        senderUserId: wife.id,
        type: 'system',
        content: { text: '订单已创建' },
      },
      {
        id: 'msg_1_2',
        orderId: order1.id,
        senderUserId: husband.id,
        type: 'system',
        content: { text: '厨师已接单' },
      },
      {
        id: 'msg_1_3',
        orderId: order1.id,
        senderUserId: wife.id,
        type: 'text',
        content: { text: '老公加油！' },
      },
      {
        id: 'msg_1_4',
        orderId: order1.id,
        senderUserId: husband.id,
        type: 'text',
        content: { text: '放心交给我 👨‍🍳' },
      },
      {
        id: 'msg_1_5',
        orderId: order1.id,
        senderUserId: wife.id,
        type: 'emoji',
        content: { emojiKey: 'heart' },
      },
    ],
  });

  // 订单 2: 已上菜
  const order2 = await prisma.order.create({
    data: {
      id: 'order_2',
      familyId: family.id,
      customerUserId: husband.id,
      chefUserId: wife.id,
      status: 'served',
      expectedServeAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      customerNotes: '来份蛋炒饭，饿了',
      servedAt: new Date(Date.now() - 30 * 60 * 1000),
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order2.id,
        recipeId: 'recipe_5',
        recipeSnapshot: {
          name: '蛋炒饭',
          imageUrls: ['https://picsum.photos/seed/fried-rice/400/300'],
          difficulty: 1,
        },
        sortOrder: 0,
      },
      {
        orderId: order2.id,
        recipeId: 'recipe_7',
        recipeSnapshot: {
          name: '紫菜蛋花汤',
          imageUrls: ['https://picsum.photos/seed/seaweed-soup/400/300'],
          difficulty: 1,
        },
        sortOrder: 1,
      },
    ],
  });

  await prisma.orderMessage.createMany({
    data: [
      {
        id: 'msg_2_1',
        orderId: order2.id,
        senderUserId: husband.id,
        type: 'text',
        content: { text: '老婆今天做饭！好期待' },
      },
      {
        id: 'msg_2_2',
        orderId: order2.id,
        senderUserId: wife.id,
        type: 'text',
        content: { text: '哼，还不是你饿了' },
      },
      {
        id: 'msg_2_3',
        orderId: order2.id,
        senderUserId: husband.id,
        type: 'emoji',
        content: { emojiKey: 'shy' },
      },
    ],
  });

  // 订单 3: 已完成 (含评价)
  const order3 = await prisma.order.create({
    data: {
      id: 'order_3',
      familyId: family.id,
      customerUserId: wife.id,
      chefUserId: husband.id,
      status: 'completed',
      expectedServeAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      customerNotes: '想吃可乐鸡翅和番茄炒蛋',
      servedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      totalLovePoints: 15,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order3.id,
        recipeId: 'recipe_1',
        recipeSnapshot: {
          name: '番茄炒蛋',
          imageUrls: ['https://picsum.photos/seed/tomato-egg/400/300'],
          difficulty: 1,
        },
        sortOrder: 0,
      },
      {
        orderId: order3.id,
        recipeId: 'recipe_8',
        recipeSnapshot: {
          name: '可乐鸡翅',
          imageUrls: ['https://picsum.photos/seed/cola-wings/400/300'],
          difficulty: 2,
        },
        sortOrder: 1,
      },
    ],
  });

  await prisma.orderMessage.createMany({
    data: [
      {
        id: 'msg_3_1',
        orderId: order3.id,
        senderUserId: wife.id,
        type: 'text',
        content: { text: '鸡翅好好吃！' },
      },
      {
        id: 'msg_3_2',
        orderId: order3.id,
        senderUserId: husband.id,
        type: 'text',
        content: { text: '喜欢就多做给你吃' },
      },
      {
        id: 'msg_3_3',
        orderId: order3.id,
        senderUserId: wife.id,
        type: 'rush',
        content: { kind: 'rush' },
      },
      {
        id: 'msg_3_4',
        orderId: order3.id,
        senderUserId: wife.id,
        type: 'tip',
        content: { amount: 10, title: '爱心打赏' },
      },
      {
        id: 'msg_3_5',
        orderId: order3.id,
        senderUserId: husband.id,
        type: 'text',
        content: { text: '谢谢老婆的爱心币！' },
      },
    ],
  });

  // ── 6. 评价 ──────────────────────────────────────────────
  await prisma.rating.create({
    data: {
      id: 'rating_3',
      orderId: order3.id,
      raterUserId: wife.id,
      stars: 5,
      comment: '超级好吃！番茄炒蛋蛋嫩汁多，可乐鸡翅甜咸刚好，大厨老公名不虚传！',
    },
  });

  console.log(`✅ 订单: 3 个 (cooking / served / completed)`);
  console.log(`✅ 订单消息: 13 条`);
  console.log(`✅ 评价: 1 条`);

  // ── 7. 爱心币流水 ──────────────────────────────────────────
  await prisma.lovePointLog.createMany({
    data: [
      {
        id: 'lp_1',
        familyId: family.id,
        userId: husband.id,
        changeAmount: 10,
        balanceAfter: 10,
        changeType: 'cook_reward',
        sourceOrderId: order3.id,
        description: '做菜奖励',
      },
      {
        id: 'lp_2',
        familyId: family.id,
        userId: husband.id,
        changeAmount: 5,
        balanceAfter: 15,
        changeType: 'rating_bonus',
        sourceOrderId: order3.id,
        description: '5星好评加成',
      },
      {
        id: 'lp_3',
        familyId: family.id,
        userId: wife.id,
        changeAmount: -10,
        balanceAfter: 40,
        changeType: 'tip_send',
        sourceOrderId: order3.id,
        description: '打赏：爱心打赏',
        reversibleUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      {
        id: 'lp_4',
        familyId: family.id,
        userId: husband.id,
        changeAmount: 10,
        balanceAfter: 25,
        changeType: 'tip_receive',
        sourceOrderId: order3.id,
        description: '打赏：爱心打赏',
      },
      {
        id: 'lp_5',
        familyId: family.id,
        userId: wife.id,
        changeAmount: 50,
        balanceAfter: 50,
        changeType: 'check_in',
        description: '每日签到',
      },
    ],
  });

  console.log(`✅ 爱心币流水: 5 条 (老公余额 25, 老婆余额 40)`);

  // ── 8. 时间线 ──────────────────────────────────────────────
  await prisma.timelineEntry.createMany({
    data: [
      {
        id: 'tl_1',
        familyId: family.id,
        sourceType: 'order',
        sourceOrderId: order3.id,
        occurredAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        imageUrls: [
          'https://picsum.photos/seed/tomato-egg/400/300',
          'https://picsum.photos/seed/cola-wings/400/300',
        ],
        customerUserId: wife.id,
        chefUserId: husband.id,
        customerComment: '番茄炒蛋+可乐鸡翅，完美搭配！',
        chefComment: '看到你吃得开心就是最大的满足',
      },
    ],
  });

  console.log(`✅ 时间线: 1 条`);

  // ── 9. 厨师等级定义 (upsert 幂等) ───────────────────────────
  const chefLevelData = CHEF_LEVELS.map((lv, idx) => ({
    key: lv.key,
    title: lv.title,
    emoji: lv.emoji,
    minOrders: lv.minOrders,
    minAvgRating: lv.minAvgRating,
    sortOrder: idx * 10,
  }));

  for (const level of chefLevelData) {
    await prisma.chefLevelDefinition.upsert({
      where: { key: level.key },
      update: {
        title: level.title,
        emoji: level.emoji,
        minOrders: level.minOrders,
        minAvgRating: level.minAvgRating,
        sortOrder: level.sortOrder,
      },
      create: level,
    });
  }

  console.log(`✅ 厨师等级: ${chefLevelData.length} 个`);

  // ── 10. 成就徽章定义 (upsert 幂等) ─────────────────────────
  for (const badge of BADGES) {
    await prisma.badgeDefinition.upsert({
      where: { key: badge.key },
      update: {
        title: badge.title,
        description: badge.description,
        emoji: badge.emoji,
        category: badge.category,
        ownerType: badge.ownerType,
        triggerType: badge.triggerType,
        evaluatorType: badge.evaluatorType,
        evaluatorConfig: badge.evaluatorConfig as any,
        hidden: badge.hidden,
        progressTarget: badge.progressTarget,
        sortOrder: badge.sortOrder,
      },
      create: {
        key: badge.key,
        title: badge.title,
        description: badge.description,
        emoji: badge.emoji,
        category: badge.category,
        ownerType: badge.ownerType,
        triggerType: badge.triggerType,
        evaluatorType: badge.evaluatorType,
        evaluatorConfig: badge.evaluatorConfig as any,
        hidden: badge.hidden,
        progressTarget: badge.progressTarget,
        sortOrder: badge.sortOrder,
      },
    });
  }

  console.log(`✅ 徽章定义: ${BADGES.length} 个`);

  // ── 总结 ────────────────────────────────────────────────
  console.log('\n🎉 模拟数据播种完成！\n');
  console.log('用户:');
  console.log('  👨 大厨老公 (user_husband)');
  console.log('  👩 吃货老婆 (user_wife)');
  console.log('家庭: 甜蜜小厨房 (family_demo)');
  console.log('菜谱: 8 道 (番茄炒蛋、红烧排骨、清蒸鲈鱼...)');
  console.log('订单: 3 个 (cooking / served / completed)');
  console.log(`厨师等级: ${chefLevelData.length} 个`);
  console.log(`徽章定义: ${BADGES.length} 个`);
}

main()
  .catch((e) => {
    console.error('❌ 播种失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
