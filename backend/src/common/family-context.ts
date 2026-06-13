import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { TtlCache } from './ttl-cache';

/** 5-minute TTL cache for requireFamilyId (called on every request). */
const familyIdCache = new TtlCache<string>(5 * 60_000);

/**
 * 取当前用户活跃家庭 ID，没有则抛 403。
 * 给业务 Service 用，强制所有"家庭维度"操作都走家庭隔离。
 */
export async function requireFamilyId(prisma: PrismaService, userId: string): Promise<string> {
  const cached = familyIdCache.get(userId);
  if (cached) return cached;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentFamilyId: true },
  });
  if (!user?.currentFamilyId) {
    throw new ForbiddenException({
      code: 'NOT_IN_FAMILY',
      message: '请先创建或加入小厨房',
    });
  }
  familyIdCache.set(userId, user.currentFamilyId);
  return user.currentFamilyId;
}

/** Invalidate cached familyId for a user (call on join/leave/create). */
export function invalidateFamilyIdCache(userId: string): void {
  familyIdCache.delete(userId);
}
