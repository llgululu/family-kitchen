import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

function buildCtx(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  it('rejects when no user on request', () => {
    expect(() => guard.canActivate(buildCtx(undefined))).toThrow(ForbiddenException);
  });

  it('rejects normal user', () => {
    expect(() => guard.canActivate(buildCtx({ userId: 'u1', isAdmin: false }))).toThrow(
      ForbiddenException,
    );
  });

  it('passes admin user', () => {
    expect(guard.canActivate(buildCtx({ userId: 'admin:root', isAdmin: true }))).toBe(true);
  });
});
