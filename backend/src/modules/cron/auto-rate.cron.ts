import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderStatus } from '@family-kitchen/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { RatingService } from '../order/rating.service';
import { BusinessConfigService } from '../business-config/business-config.service';

/**
 * 每 10 分钟扫一次：已上菜超过 24 小时未评价的订单，自动 5 星完成。
 * 走 RatingService.create 保证状态流转 / 爱心币结算 / 时间线生成都一致。
 */
@Injectable()
export class AutoRateCron {
  private readonly logger = new Logger(AutoRateCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ratingService: RatingService,
    private readonly bizConfig: BusinessConfigService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async run(): Promise<void> {
    const cutoff = new Date(
      Date.now() - this.bizConfig.getOrderTiming().AUTO_RATE_AFTER_SERVED_SECONDS * 1000,
    );
    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.SERVED,
        servedAt: { lte: cutoff },
        rating: null,
      },
      select: { id: true, customerUserId: true },
      take: 100,
    });

    if (orders.length === 0) return;
    this.logger.log(`auto-rate: 处理 ${orders.length} 个超时未评价订单`);

    for (const order of orders) {
      try {
        await this.ratingService.create(order.customerUserId, order.id, {
          stars: 5,
          comment: undefined,
          imageUrls: undefined,
        });
      } catch (err) {
        this.logger.warn(
          `auto-rate 订单 ${order.id} 失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}
