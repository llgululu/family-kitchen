import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { UserModule } from './modules/user/user.module';
import { FamilyModule } from './modules/family/family.module';
import { RecipeModule } from './modules/recipe/recipe.module';
import { OrderModule } from './modules/order/order.module';
import { LovePointModule } from './modules/love-point/love-point.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { StorageModule } from './modules/storage/storage.module';
import { AchievementModule } from './modules/achievement/achievement.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { CronModule } from './modules/cron/cron.module';
import { BusinessConfigModule } from './modules/business-config/business-config.module';
import { WsModule } from './modules/ws/ws.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: envValidationSchema,
    }),
    LoggerModule.forRootAsync({
      useFactory: () => {
        const isDev = process.env.NODE_ENV !== 'production';
        const level = process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info');
        const logFile = process.env.LOG_FILE?.trim();

        // 控制台输出：开发用 pino-pretty 美化，生产打 JSON 到 stdout
        const targets: Array<{ target: string; level: string; options: Record<string, unknown> }> =
          [
            isDev
              ? { target: 'pino-pretty', level, options: { colorize: true, singleLine: true } }
              : { target: 'pino/file', level, options: { destination: 1 } },
          ];
        // 文件输出：设置了 LOG_FILE 时，额外把 JSON 日志写入文件（mkdir 自动建目录）
        if (logFile) {
          targets.push({
            target: 'pino/file',
            level,
            options: { destination: logFile, mkdir: true },
          });
        }

        return {
          pinoHttp: {
            level,
            transport: { targets },
            redact: ['req.headers.authorization'],
          },
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    BusinessConfigModule,
    HealthModule,
    AuthModule,
    UserModule,
    FamilyModule,
    RecipeModule,
    OrderModule,
    LovePointModule,
    TimelineModule,
    StorageModule,
    AchievementModule,
    NotificationModule,
    AdminModule,
    FeedbackModule,
    CronModule,
    WsModule,
    AiModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
