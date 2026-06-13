import { Injectable, NotFoundException } from '@nestjs/common';
import type { Feedback, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, type PaginatedResponseDto } from '../../common/pagination.dto';
import type {
  CreateFeedbackDto,
  FeedbackDto,
  FeedbackQueryDto,
  UpdateFeedbackStatusDto,
} from './dto/feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string | null, dto: CreateFeedbackDto): Promise<FeedbackDto> {
    const created = await this.prisma.feedback.create({
      data: {
        userId,
        content: dto.content,
        contact: dto.contact,
        appVersion: dto.appVersion,
        platform: dto.platform,
      },
    });
    return this.toDto(created);
  }

  async list(query: FeedbackQueryDto): Promise<PaginatedResponseDto<FeedbackDto>> {
    const where: Prisma.FeedbackWhereInput = {};
    if (query.statuses?.length) {
      where.status = { in: query.statuses };
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.feedback.count({ where }),
    ]);
    return paginate(
      items.map((f) => this.toDto(f)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async updateStatus(id: string, dto: UpdateFeedbackStatusDto): Promise<FeedbackDto> {
    const exists = await this.prisma.feedback.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException({
        code: 'FEEDBACK_NOT_FOUND',
        message: '反馈不存在',
      });
    }
    const updated = await this.prisma.feedback.update({
      where: { id },
      data: { status: dto.status },
    });
    return this.toDto(updated);
  }

  private toDto(f: Feedback): FeedbackDto {
    return {
      id: f.id,
      userId: f.userId,
      content: f.content,
      contact: f.contact,
      status: f.status,
      appVersion: f.appVersion,
      platform: f.platform,
      createdAt: f.createdAt,
    };
  }
}
