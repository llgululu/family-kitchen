import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateChefLevelDto {
  key: string;
  title: string;
  emoji: string;
  minOrders?: number;
  minAvgRating?: number;
  sortOrder?: number;
}

export interface UpdateChefLevelDto {
  title?: string;
  emoji?: string;
  minOrders?: number;
  minAvgRating?: number;
  sortOrder?: number;
}

@Injectable()
export class AdminChefLevelService {
  private readonly logger = new Logger(AdminChefLevelService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.chefLevelDefinition.findMany({
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.chefLevelDefinition.count(),
    ]);
    return { items, total };
  }

  async get(key: string) {
    const level = await this.prisma.chefLevelDefinition.findUnique({
      where: { key },
    });
    if (!level) {
      throw new NotFoundException({ code: 'CHEF_LEVEL_NOT_FOUND', message: '厨师等级不存在' });
    }
    return level;
  }

  async create(dto: CreateChefLevelDto) {
    const existing = await this.prisma.chefLevelDefinition.findUnique({ where: { key: dto.key } });
    if (existing) {
      throw new BadRequestException({
        code: 'CHEF_LEVEL_KEY_EXISTS',
        message: '等级 key 已存在',
      });
    }
    this.validateRating(dto.minAvgRating);
    if (dto.minOrders !== undefined && dto.minOrders < 0) {
      throw new BadRequestException({ code: 'INVALID_MIN_ORDERS', message: '最低订单数不能为负' });
    }
    return this.prisma.chefLevelDefinition.create({
      data: {
        key: dto.key,
        title: dto.title,
        emoji: dto.emoji,
        minOrders: dto.minOrders ?? 0,
        minAvgRating: dto.minAvgRating ?? 0,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(key: string, dto: UpdateChefLevelDto) {
    await this.requireLevel(key);
    if (dto.minAvgRating !== undefined) this.validateRating(dto.minAvgRating);
    if (dto.minOrders !== undefined && dto.minOrders < 0) {
      throw new BadRequestException({ code: 'INVALID_MIN_ORDERS', message: '最低订单数不能为负' });
    }

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.emoji !== undefined) data.emoji = dto.emoji;
    if (dto.minOrders !== undefined) data.minOrders = dto.minOrders;
    if (dto.minAvgRating !== undefined) data.minAvgRating = dto.minAvgRating;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    return this.prisma.chefLevelDefinition.update({
      where: { key },
      data,
    });
  }

  async toggle(key: string) {
    const level = await this.requireLevel(key);
    // 不允许停用最后一个启用的等级
    if (level.isActive) {
      const activeCount = await this.prisma.chefLevelDefinition.count({
        where: { isActive: true },
      });
      if (activeCount <= 1) {
        throw new BadRequestException({
          code: 'CANNOT_DEACTIVATE_LAST',
          message: '至少需要保留一个启用的等级',
        });
      }
    }
    return this.prisma.chefLevelDefinition.update({
      where: { key },
      data: { isActive: !level.isActive },
    });
  }

  async remove(key: string) {
    await this.requireLevel(key);
    // 软删除：如果有依赖则停用
    const activeCount = await this.prisma.chefLevelDefinition.count({
      where: { isActive: true },
    });
    const level = await this.prisma.chefLevelDefinition.findUnique({ where: { key } });
    if (activeCount <= 1 && level?.isActive) {
      throw new BadRequestException({
        code: 'CANNOT_DELETE_LAST_ACTIVE',
        message: '至少需要保留一个启用的等级',
      });
    }
    return this.prisma.chefLevelDefinition.delete({ where: { key } });
  }

  async seed() {
    const { execSync } = require('child_process');
    try {
      execSync('npx ts-node prisma/seed-chef-levels.ts', {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 30000,
      });
      return { success: true, message: '厨师等级种子数据执行完成' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException({
        code: 'SEED_FAILED',
        message: `种子数据执行失败: ${message}`,
      });
    }
  }

  private async requireLevel(key: string) {
    const level = await this.prisma.chefLevelDefinition.findUnique({ where: { key } });
    if (!level) {
      throw new NotFoundException({ code: 'CHEF_LEVEL_NOT_FOUND', message: '厨师等级不存在' });
    }
    return level;
  }

  private validateRating(value: number | undefined) {
    if (value !== undefined && (value < 0 || value > 5)) {
      throw new BadRequestException({
        code: 'INVALID_AVG_RATING',
        message: '平均评分必须在 0~5 之间',
      });
    }
  }
}
