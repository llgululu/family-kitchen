import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/current-user.decorator';

/**
 * 管理员守卫：要求 JWT 解析出的上下文 isAdmin=true。
 * 必须在 JwtAuthGuard 之后执行（实际由 NestJS 守卫栈保证：APP_GUARD 先跑）。
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!request.user?.isAdmin) {
      throw new ForbiddenException({
        code: 'NOT_ADMIN',
        message: '此接口仅管理员可访问',
      });
    }
    return true;
  }
}
