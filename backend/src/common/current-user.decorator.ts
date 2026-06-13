import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** 从请求 user 中取已认证用户上下文 */
export interface AuthUser {
  userId: string;
  wxOpenid?: string;
  isAdmin?: boolean;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | unknown => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
