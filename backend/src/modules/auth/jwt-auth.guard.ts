import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../../common/public.decorator';
import type { AuthUser } from '../../common/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string; // userId（普通用户）或 admin:username
  openid?: string;
  isAdmin?: boolean;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthUser;
    }>();
    const authHeader = request.headers.authorization ?? request.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '缺少认证 token' });
    }
    const token = authHeader.slice(7);

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'token 无效或已过期' });
    }

    // 已注销账号拒绝
    if (!payload.isAdmin) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { deletedAt: true },
      });
      if (!user || user.deletedAt) {
        throw new UnauthorizedException({
          code: 'ACCOUNT_DELETED',
          message: '账号不存在或已注销',
        });
      }
    }

    request.user = {
      userId: payload.sub,
      wxOpenid: payload.openid,
      isAdmin: payload.isAdmin ?? false,
    };
    return true;
  }
}
