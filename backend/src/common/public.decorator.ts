import { SetMetadata } from '@nestjs/common';

/** 标记接口为公开（绕过 JwtAuthGuard） */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
