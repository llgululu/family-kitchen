import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WxNotifyService } from './wx-notify.service';
import { NotificationLogService } from './notification-log.service';
import {
  BusinessConfigService,
  type WxTemplateKey,
} from '../business-config/business-config.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bizConfig: BusinessConfigService,
    private readonly wxNotify: WxNotifyService,
    private readonly notificationLog: NotificationLogService,
  ) {}

  /** 厨师接单后通知食客 */
  async sendOrderAccepted(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, items: true },
    });
    if (!order) return;
    const firstItem = order.items[0];
    const snap = (firstItem?.recipeSnapshot ?? {}) as Record<string, unknown>;
    const dishName = String(snap.name ?? '菜品');

    // 站内通知
    void this.notificationLog.create({
      userId: order.customerUserId,
      type: 'order_accepted',
      title: '订单已接单',
      body: `你点的「${dishName}」已被接单`,
      data: { orderId },
    });

    const tid = this.templateId('ORDER_ACCEPTED');
    if (!tid) return;
    const touser = order.customer.wxOpenid;
    if (!touser) return;
    await this.wxNotify.send({
      touser,
      template_id: tid,
      page: `pages/order/detail?id=${order.id}`,
      data: {
        thing1: { value: cap(dishName, 20) },
        time2: { value: formatTime(order.expectedServeAt) },
      },
    });
  }

  /** 厨师上菜后通知食客 */
  async sendOrderServed(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, items: true },
    });
    if (!order) return;
    const firstItem = order.items[0];
    const snap = (firstItem?.recipeSnapshot ?? {}) as Record<string, unknown>;
    const dishName = String(snap.name ?? '菜品');

    // 站内通知
    void this.notificationLog.create({
      userId: order.customerUserId,
      type: 'order_served',
      title: '菜已上桌',
      body: `「${dishName}」已上菜，快去评价吧`,
      data: { orderId },
    });

    const tid = this.templateId('ORDER_SERVED');
    if (!tid) return;
    const touser = order.customer.wxOpenid;
    if (!touser) return;
    await this.wxNotify.send({
      touser,
      template_id: tid,
      page: `pages/order/detail?id=${order.id}`,
      data: {
        thing1: { value: cap(dishName, 20) },
        time2: { value: formatTime(new Date()) },
      },
    });
  }

  /** 期望时间临近时提醒厨师（cron job 用） */
  async sendOrderReminder(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { chef: true, items: true },
    });
    if (!order) return;
    const tid = this.templateId('ORDER_RUSHED'); // 复用催菜模板
    if (!tid) return;
    const touser = order.chef.wxOpenid;
    if (!touser) return; // 非微信用户（如 H5 注册）无 openid，跳过微信推送
    const firstItem = order.items[0];
    const snap = (firstItem?.recipeSnapshot ?? {}) as Record<string, unknown>;
    await this.wxNotify.send({
      touser,
      template_id: tid,
      page: `pages/order/detail?id=${order.id}`,
      data: {
        thing1: { value: cap(`即将到「${String(snap.name ?? '菜品')}」期望时间`, 20) },
        number2: { value: '0' },
      },
    });
  }

  /** 食客催菜后通知厨师 */
  async sendOrderRushed(orderId: string, rushCount: number): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { chef: true },
    });
    if (!order) return;

    // 站内通知
    void this.notificationLog.create({
      userId: order.chefUserId,
      type: 'order_rushed',
      title: '催菜提醒',
      body: `食客催菜了！已催 ${rushCount} 次`,
      data: { orderId, rushCount },
    });

    const tid = this.templateId('ORDER_RUSHED');
    if (!tid) return;
    const touser = order.chef.wxOpenid;
    if (!touser) return;
    await this.wxNotify.send({
      touser,
      template_id: tid,
      page: `pages/order/detail?id=${order.id}`,
      data: {
        thing1: { value: '催菜啦！' },
        number2: { value: String(rushCount) },
      },
    });
  }

  /** 解锁徽章后通知 owner */
  async sendAchievementUnlocked(input: {
    userId: string;
    userOpenid: string;
    badgeTitle: string;
    badgeDescription: string;
  }): Promise<void> {
    // 站内通知
    void this.notificationLog.create({
      userId: input.userId,
      type: 'achievement_unlocked',
      title: '新成就解锁',
      body: `恭喜解锁「${input.badgeTitle}」`,
      data: { badgeTitle: input.badgeTitle },
    });

    const tid = this.templateId('ACHIEVEMENT_UNLOCKED');
    if (!tid) return;
    await this.wxNotify.send({
      touser: input.userOpenid,
      template_id: tid,
      data: {
        thing1: { value: cap(input.badgeTitle, 20) },
        thing2: { value: cap(input.badgeDescription, 20) },
        time3: { value: formatTime(new Date()) },
      },
    });
  }

  /** 纪念日提醒：通知家庭所有成员 */
  async sendAnniversaryReminder(familyId: string, familyName: string): Promise<void> {
    const members = await this.prisma.familyMember.findMany({
      where: { familyId, leftAt: null },
      include: { user: { select: { wxOpenid: true } } },
    });

    const tid = this.templateId('ANNIVERSARY_REMINDER');

    for (const member of members) {
      // 站内通知
      void this.notificationLog.create({
        userId: member.userId,
        type: 'anniversary',
        title: '纪念日快乐',
        body: `今天是「${familyName}」的纪念日`,
        data: { familyId },
      });

      if (!tid) continue;
      const touser = member.user.wxOpenid;
      if (!touser) continue;
      try {
        await this.wxNotify.send({
          touser,
          template_id: tid,
          page: 'pages/tabbar/home/home',
          data: {
            thing1: { value: cap(`${familyName} 的纪念日`, 20) },
            time2: { value: formatTime(new Date()) },
          },
        });
      } catch {
        // 单个成员推送失败不影响其他
      }
    }
  }

  private templateId(key: WxTemplateKey): string {
    const id = this.bizConfig.getWxTemplateId(key);
    if (!id) {
      this.logger.error(`wx template id missing for ${key} — skipping push`);
    }
    return id;
  }
}

// ============================================================
// helpers
// ============================================================

function cap(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function formatTime(d: Date | null): string {
  const date = d ?? new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
