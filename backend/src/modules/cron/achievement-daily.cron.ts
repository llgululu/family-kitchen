import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FamilyStatus } from '@family-kitchen/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AchievementService } from '../achievement/achievement.service';
import { NotificationService } from '../notification/notification.service';

/**
 * 每日凌晨扫一次：
 * 1. 检查所有活跃家庭的年龄，触发 family_age 成就
 * 2. 检查纪念日匹配，发送提醒
 */
@Injectable()
export class AchievementDailyCron {
  private readonly logger = new Logger(AchievementDailyCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly achievement: AchievementService,
    private readonly notification: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async run(): Promise<void> {
    await this.checkFamilyAge();
    await this.checkAnniversaries();
  }

  private async checkFamilyAge(): Promise<void> {
    const families = await this.prisma.family.findMany({
      where: { status: FamilyStatus.ACTIVE },
      select: { id: true, createdAt: true },
      take: 500,
    });

    if (families.length === 0) return;
    this.logger.log(`achievement-daily: 检查 ${families.length} 个活跃家庭的年龄成就`);

    for (const family of families) {
      try {
        const member = await this.prisma.familyMember.findFirst({
          where: { familyId: family.id, leftAt: null },
          select: { userId: true },
        });
        if (!member) continue;

        await this.achievement.evaluate('daily_check', {
          prisma: this.prisma,
          userId: member.userId,
          familyId: family.id,
          triggerType: 'daily_check',
          family: { id: family.id, createdAt: family.createdAt },
        });
      } catch (err) {
        this.logger.warn(
          `achievement-daily 家庭 ${family.id} 失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  private async checkAnniversaries(): Promise<void> {
    const now = new Date();
    const todayMonth = now.getMonth() + 1;
    const todayDay = now.getDate();

    const families = await this.prisma.family.findMany({
      where: {
        status: FamilyStatus.ACTIVE,
        anniversaryDate: { not: null },
      },
      select: { id: true, name: true, anniversaryDate: true },
      take: 500,
    });

    for (const family of families) {
      const anniv = family.anniversaryDate;
      if (!anniv) continue;
      const annivMonth = anniv.getMonth() + 1;
      const annivDay = anniv.getDate();
      if (annivMonth !== todayMonth || annivDay !== todayDay) continue;

      this.logger.log(`anniversary: 家庭 ${family.id} 纪念日匹配`);

      try {
        const members = await this.prisma.familyMember.findMany({
          where: { familyId: family.id, leftAt: null },
          select: { userId: true },
        });

        // 触发 family_anniversary 成就评估
        for (const member of members) {
          try {
            await this.achievement.evaluate('daily_check', {
              prisma: this.prisma,
              userId: member.userId,
              familyId: family.id,
              triggerType: 'family_anniversary',
              family: { id: family.id, createdAt: anniv },
            });
          } catch {
            // 单个成员失败不影响其他成员
          }
        }

        // 发送纪念日提醒通知
        await this.notification.sendAnniversaryReminder(family.id, family.name);
      } catch (err) {
        this.logger.warn(
          `anniversary 家庭 ${family.id} 失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}
