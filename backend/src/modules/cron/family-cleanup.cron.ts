import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FamilyStatus } from '@family-kitchen/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessConfigService } from '../business-config/business-config.service';

/**
 * 每日扫一次：dissolving 状态超过 30 天的家庭，置为 dissolved。
 * 真正的数据清理由数据库 cascade 完成（family 删除时 → recipe / order / timeline 等都 onDelete:Cascade）。
 * 这里采取保守方案：只更新 status 不真正删除数据，便于后续 ops 需要时手动恢复。
 */
@Injectable()
export class FamilyCleanupCron {
  private readonly logger = new Logger(FamilyCleanupCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bizConfig: BusinessConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run(): Promise<void> {
    const cutoff = new Date(
      Date.now() - this.bizConfig.getFamilyLimits().RECOVERY_DAYS * 24 * 60 * 60 * 1000,
    );
    const result = await this.prisma.family.updateMany({
      where: {
        status: FamilyStatus.DISSOLVING,
        dissolvingAt: { lte: cutoff },
      },
      data: {
        status: FamilyStatus.DISSOLVED,
      },
    });
    if (result.count > 0) {
      this.logger.log(`family-cleanup: 已将 ${result.count} 个家庭置为 dissolved`);
    }
  }
}
