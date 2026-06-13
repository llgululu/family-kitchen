import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, type PaginatedResponseDto } from '../../common/pagination.dto';

@Injectable()
export class NotificationLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    return this.prisma.notificationLog.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data ? JSON.parse(JSON.stringify(input.data)) : {},
      },
    });
  }

  async findUnreadCount(userId: string): Promise<number> {
    return this.prisma.notificationLog.count({
      where: { userId, readAt: null },
    });
  }

  async findMyLogs(
    userId: string,
    query: { page: number; pageSize: number },
  ): Promise<PaginatedResponseDto<NotificationLogItem>> {
    const skip = (query.page - 1) * query.pageSize;
    const where = { userId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return paginate(
      items.map((i) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        body: i.body,
        data: i.data as Record<string, unknown>,
        readAt: i.readAt,
        createdAt: i.createdAt,
      })),
      total,
      query.page,
      query.pageSize,
    );
  }

  async markRead(userId: string, id: string): Promise<void> {
    await this.prisma.notificationLog.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notificationLog.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}

export interface NotificationLogItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
}
