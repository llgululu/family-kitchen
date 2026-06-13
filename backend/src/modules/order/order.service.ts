import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ACTIVE_ORDER_STATUSES, OrderStatus } from '@family-kitchen/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { requireFamilyId } from '../../common/family-context';
import { paginate, type PaginatedResponseDto } from '../../common/pagination.dto';
import { NotificationService } from '../notification/notification.service';
import { AchievementService } from '../achievement/achievement.service';
import type { EvaluateContext } from '../achievement/evaluator-registry';
import { assertTransition } from './order-status';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { AcceptOrderDto } from './dto/accept-order.dto';
import type { RejectOrderDto } from './dto/reject-order.dto';
import type { CancelOrderDto } from './dto/cancel-order.dto';
import type { ServeOrderDto } from './dto/serve-order.dto';
import type { OrderQueryDto } from './dto/order-query.dto';
import type { OrderDto, OrderItemOutputDto, OrderRatingOutputDto } from './dto/order.dto';

const orderInclude = {
  items: { orderBy: { sortOrder: 'asc' } },
  rating: true,
  customer: { select: { nickname: true, avatarUrl: true } },
  chef: { select: { nickname: true, avatarUrl: true } },
} as const satisfies Prisma.OrderInclude;

type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService,
    private readonly achievement: AchievementService,
  ) {}

  // ============================================================
  // Create
  // ============================================================

  async create(userId: string, dto: CreateOrderDto): Promise<OrderDto> {
    const familyId = await requireFamilyId(this.prisma, userId);

    // 厨师必须是同家庭成员
    const chefMembership = await this.prisma.familyMember.findFirst({
      where: { familyId, userId: dto.chefUserId, leftAt: null },
    });
    if (!chefMembership) {
      throw new BadRequestException({
        code: 'CHEF_NOT_IN_FAMILY',
        message: '厨师必须是本家庭成员',
      });
    }

    // 一家庭一活跃单
    const activeCount = await this.prisma.order.count({
      where: { familyId, status: { in: ACTIVE_ORDER_STATUSES as unknown as string[] } },
    });
    if (activeCount > 0) {
      throw new ConflictException({
        code: 'ACTIVE_ORDER_EXISTS',
        message: '已有一个活跃订单，先完成或取消才能下新单',
      });
    }

    // 菜品必须在本家庭、未删除
    const recipes = await this.prisma.recipe.findMany({
      where: {
        id: { in: dto.items.map((i) => i.recipeId) },
        familyId,
        isDeleted: false,
      },
    });
    if (recipes.length !== dto.items.length) {
      throw new BadRequestException({
        code: 'RECIPE_INVALID',
        message: '菜品中有不存在或不属于本家庭的菜谱',
      });
    }
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));

    const order = await this.prisma.order.create({
      data: {
        familyId,
        customerUserId: userId,
        chefUserId: dto.chefUserId,
        status: OrderStatus.PENDING,
        expectedServeAt: dto.expectedServeAt ? new Date(dto.expectedServeAt) : null,
        customerNotes: dto.customerNotes,
        items: {
          create: dto.items.map((item, idx) => {
            const recipe = recipeMap.get(item.recipeId)!;
            return {
              recipeId: recipe.id,
              recipeSnapshot: {
                name: recipe.name,
                imageUrls: Array.isArray(recipe.imageUrls) ? (recipe.imageUrls as string[]) : [],
                difficulty: recipe.difficulty,
              } as Prisma.InputJsonValue,
              customNotes: item.customNotes,
              sortOrder: idx,
            };
          }),
        },
      },
      include: orderInclude,
    });

    // 触发 order_created 成就评估（fire-and-forget）
    void this.triggerOrderCreated(userId, familyId, order);

    return this.toDto(order, userId);
  }

  // ============================================================
  // Read
  // ============================================================

  async findActive(userId: string): Promise<OrderDto | null> {
    const familyId = await requireFamilyId(this.prisma, userId);
    const order = await this.prisma.order.findFirst({
      where: {
        familyId,
        status: { in: ACTIVE_ORDER_STATUSES as unknown as string[] },
      },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    return order ? this.toDto(order, userId) : null;
  }

  async findOne(userId: string, id: string): Promise<OrderDto> {
    const order = await this.requireOwnedOrder(userId, id);
    return this.toDto(order, userId);
  }

  async findAll(userId: string, query: OrderQueryDto): Promise<PaginatedResponseDto<OrderDto>> {
    const familyId = await requireFamilyId(this.prisma, userId);

    const where: Prisma.OrderWhereInput = { familyId };
    if (query.statuses?.length) {
      where.status = { in: query.statuses };
    }
    if (query.role === 'customer') {
      where.customerUserId = userId;
    } else if (query.role === 'chef') {
      where.chefUserId = userId;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.order.count({ where }),
    ]);

    const unreadMap = new Map<string, number>();
    if (items.length > 0) {
      const grouped = await this.prisma.orderMessage.groupBy({
        by: ['orderId'],
        where: {
          orderId: { in: items.map((o) => o.id) },
          senderUserId: { not: userId },
          readAt: null,
        },
        _count: { id: true },
      });
      for (const g of grouped) unreadMap.set(g.orderId, g._count.id);
    }

    return paginate(
      items.map((o) => this.toDto(o, userId, unreadMap.get(o.id) || 0)),
      total,
      query.page,
      query.pageSize,
    );
  }

  // ============================================================
  // State transitions
  // ============================================================

  async accept(userId: string, id: string, dto: AcceptOrderDto): Promise<OrderDto> {
    const order = await this.requireOwnedOrder(userId, id);
    this.requireRole(order, userId, 'chef');
    assertTransition(order.status as OrderStatus, OrderStatus.ACCEPTED);

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.ACCEPTED,
        ...(dto.expectedServeAt ? { expectedServeAt: new Date(dto.expectedServeAt) } : {}),
      },
      include: orderInclude,
    });
    void this.notification.sendOrderAccepted(updated.id);
    return this.toDto(updated, userId);
  }

  async reject(userId: string, id: string, dto: RejectOrderDto): Promise<OrderDto> {
    const order = await this.requireOwnedOrder(userId, id);
    this.requireRole(order, userId, 'chef');
    assertTransition(order.status as OrderStatus, OrderStatus.REJECTED);

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.REJECTED,
        rejectReason: dto.reason ?? null,
      },
      include: orderInclude,
    });
    return this.toDto(updated, userId);
  }

  async setPrepping(userId: string, id: string): Promise<OrderDto> {
    return this.chefAdvance(userId, id, OrderStatus.PREPPING);
  }

  async setCooking(userId: string, id: string): Promise<OrderDto> {
    return this.chefAdvance(userId, id, OrderStatus.COOKING);
  }

  async serve(userId: string, id: string, dto: ServeOrderDto): Promise<OrderDto> {
    const order = await this.requireOwnedOrder(userId, id);
    this.requireRole(order, userId, 'chef');
    assertTransition(order.status as OrderStatus, OrderStatus.SERVED);

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.SERVED,
        servedImageUrls: dto.imageUrls as unknown as Prisma.InputJsonValue,
        servedAt: new Date(),
      },
      include: orderInclude,
    });
    void this.notification.sendOrderServed(updated.id);

    // 触发 order_served 成就评估（fire-and-forget）
    void this.triggerOrderServed(userId, updated);

    return this.toDto(updated, userId);
  }

  async cancel(userId: string, id: string, dto: CancelOrderDto): Promise<OrderDto> {
    const order = await this.requireOwnedOrder(userId, id);
    // 食客和厨师都可以取消（MVP 简化：不强制对方同意）
    assertTransition(order.status as OrderStatus, OrderStatus.CANCELLED);

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        rejectReason: dto.reason ?? null,
      },
      include: orderInclude,
    });
    return this.toDto(updated, userId);
  }

  // ============================================================
  // internal helpers
  // ============================================================

  private async chefAdvance(userId: string, id: string, next: OrderStatus): Promise<OrderDto> {
    const order = await this.requireOwnedOrder(userId, id);
    this.requireRole(order, userId, 'chef');
    assertTransition(order.status as OrderStatus, next);

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: next },
      include: orderInclude,
    });
    return this.toDto(updated, userId);
  }

  private async requireOwnedOrder(userId: string, orderId: string): Promise<OrderWithItems> {
    const familyId = await requireFamilyId(this.prisma, userId);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: '订单不存在' });
    }
    if (order.familyId !== familyId) {
      throw new ForbiddenException({
        code: 'ORDER_NOT_IN_YOUR_FAMILY',
        message: '不能操作其他小厨房的订单',
      });
    }
    if (order.customerUserId !== userId && order.chefUserId !== userId) {
      throw new ForbiddenException({
        code: 'NOT_ORDER_PARTICIPANT',
        message: '你不是这笔订单的参与者',
      });
    }
    return order;
  }

  private requireRole(order: OrderWithItems, userId: string, expected: 'customer' | 'chef'): void {
    const actual = order.customerUserId === userId ? 'customer' : 'chef';
    if (actual !== expected) {
      throw new ForbiddenException({
        code: 'WRONG_ROLE',
        message: `该操作仅 ${expected === 'chef' ? '厨师' : '食客'} 可执行`,
      });
    }
  }

  private async triggerOrderCreated(
    userId: string,
    familyId: string,
    order: OrderWithItems,
  ): Promise<void> {
    try {
      const ctx: EvaluateContext = {
        prisma: this.prisma,
        userId,
        familyId,
        triggerType: 'order_created',
        order: {
          id: order.id,
          familyId: order.familyId,
          customerUserId: order.customerUserId,
          chefUserId: order.chefUserId,
        },
      };
      await this.achievement.evaluate('order_created', ctx);
    } catch {
      // 成就评估失败不应影响主流程
    }
  }

  private async triggerOrderServed(userId: string, order: OrderWithItems): Promise<void> {
    try {
      const ctx: EvaluateContext = {
        prisma: this.prisma,
        userId,
        familyId: order.familyId,
        triggerType: 'order_served',
        order: {
          id: order.id,
          familyId: order.familyId,
          customerUserId: order.customerUserId,
          chefUserId: order.chefUserId,
          servedAt: order.servedAt,
          acceptedAt: order.createdAt, // 使用 createdAt 作为近似值（无 acceptedAt 字段）
          items: order.items.map((i) => ({
            recipeId: i.recipeId,
            recipeSnapshot: i.recipeSnapshot,
          })),
        },
      };
      await this.achievement.evaluate('order_served', ctx);
    } catch {
      // 成就评估失败不应影响主流程
    }
  }

  private toDto(order: OrderWithItems, viewerUserId: string, unreadCount = 0): OrderDto {
    const items: OrderItemOutputDto[] = order.items.map((i) => {
      const snap = (i.recipeSnapshot ?? {}) as Record<string, unknown>;
      return {
        id: i.id,
        recipeId: i.recipeId,
        recipeSnapshot: {
          name: String(snap.name ?? '未命名'),
          imageUrls: Array.isArray(snap.imageUrls) ? (snap.imageUrls as string[]) : [],
          difficulty: typeof snap.difficulty === 'number' ? (snap.difficulty as number) : 3,
        },
        customNotes: i.customNotes,
        sortOrder: i.sortOrder,
      };
    });

    const servedImageUrls = Array.isArray(order.servedImageUrls)
      ? (order.servedImageUrls as string[])
      : [];

    const rating: OrderRatingOutputDto | null = order.rating
      ? {
          stars: order.rating.stars,
          comment: order.rating.comment,
          isAutoGenerated: order.rating.isAutoGenerated,
        }
      : null;

    return {
      id: order.id,
      familyId: order.familyId,
      customerUserId: order.customerUserId,
      chefUserId: order.chefUserId,
      status: order.status,
      expectedServeAt: order.expectedServeAt,
      customerNotes: order.customerNotes,
      rejectReason: order.rejectReason,
      items,
      servedImageUrls,
      servedAt: order.servedAt,
      completedAt: order.completedAt,
      totalLovePoints: order.totalLovePoints,
      rating,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      myRole: order.customerUserId === viewerUserId ? 'customer' : 'chef',
      customerNickname: (order as any).customer?.nickname ?? null,
      chefNickname: (order as any).chef?.nickname ?? null,
      customerAvatarUrl: (order as any).customer?.avatarUrl ?? null,
      chefAvatarUrl: (order as any).chef?.avatarUrl ?? null,
      unreadCount,
    };
  }
}
