import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@family-kitchen/shared';
import { assertTransition, canTransition, isTerminal, VALID_TRANSITIONS } from './order-status';

describe('order-status', () => {
  describe('canTransition', () => {
    it('pending → accepted ok', () => {
      expect(canTransition(OrderStatus.PENDING, OrderStatus.ACCEPTED)).toBe(true);
    });

    it('pending → served not ok (must go through accepted/prepping/cooking)', () => {
      expect(canTransition(OrderStatus.PENDING, OrderStatus.SERVED)).toBe(false);
    });

    it('served → cancelled not ok (cannot cancel after served)', () => {
      expect(canTransition(OrderStatus.SERVED, OrderStatus.CANCELLED)).toBe(false);
    });

    it('terminal states cannot transition', () => {
      expect(canTransition(OrderStatus.COMPLETED, OrderStatus.PENDING)).toBe(false);
      expect(canTransition(OrderStatus.REJECTED, OrderStatus.ACCEPTED)).toBe(false);
      expect(canTransition(OrderStatus.CANCELLED, OrderStatus.PENDING)).toBe(false);
    });
  });

  describe('assertTransition', () => {
    it('throws BadRequest on invalid transition', () => {
      expect(() => assertTransition(OrderStatus.SERVED, OrderStatus.CANCELLED)).toThrow(
        BadRequestException,
      );
    });

    it('does not throw on valid transition', () => {
      expect(() => assertTransition(OrderStatus.COOKING, OrderStatus.SERVED)).not.toThrow();
    });
  });

  describe('isTerminal', () => {
    it.each([OrderStatus.COMPLETED, OrderStatus.REJECTED, OrderStatus.CANCELLED])(
      '%s is terminal',
      (s) => {
        expect(isTerminal(s)).toBe(true);
      },
    );

    it.each([
      OrderStatus.PENDING,
      OrderStatus.ACCEPTED,
      OrderStatus.PREPPING,
      OrderStatus.COOKING,
      OrderStatus.SERVED,
      OrderStatus.RATED,
    ])('%s is not terminal', (s) => {
      expect(isTerminal(s)).toBe(false);
    });
  });

  it('VALID_TRANSITIONS covers all statuses', () => {
    const allStatuses = Object.values(OrderStatus);
    for (const s of allStatuses) {
      expect(VALID_TRANSITIONS[s]).toBeDefined();
    }
  });
});
