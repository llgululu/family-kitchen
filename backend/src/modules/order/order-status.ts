import { BadRequestException } from '@nestjs/common';
import { ACTIVE_ORDER_STATUSES, OrderStatus } from '@family-kitchen/shared';

/**
 * 订单状态机：定义每个状态可以转入哪些状态。
 * 对应 docs/03-information-architecture.md §5.1
 */
export const VALID_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  [OrderStatus.DRAFT]: [OrderStatus.PENDING],
  [OrderStatus.PENDING]: [OrderStatus.ACCEPTED, OrderStatus.REJECTED, OrderStatus.CANCELLED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPPING, OrderStatus.CANCELLED],
  [OrderStatus.PREPPING]: [OrderStatus.COOKING, OrderStatus.CANCELLED],
  [OrderStatus.COOKING]: [OrderStatus.SERVED, OrderStatus.CANCELLED],
  [OrderStatus.SERVED]: [OrderStatus.RATED],
  [OrderStatus.RATED]: [OrderStatus.COMPLETED],
  // terminal
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.REJECTED]: [],
  [OrderStatus.CANCELLED]: [],
} as const;

/** 是否允许从 from 转换到 to */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** 校验状态转换，非法则抛 400 */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new BadRequestException({
      code: 'INVALID_STATUS_TRANSITION',
      message: `订单状态不能从 ${from} 变到 ${to}`,
    });
  }
}

/** 是否终态 */
export function isTerminal(status: OrderStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}

/** 是否活跃（占用"一家庭一活跃单"额度） */
export function isActive(status: OrderStatus): boolean {
  return (ACTIVE_ORDER_STATUSES as readonly OrderStatus[]).includes(status);
}
