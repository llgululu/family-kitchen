import { Global, Module } from '@nestjs/common';
import { WxAccessTokenService } from './wx-access-token.service';
import { WxNotifyService } from './wx-notify.service';
import { NotificationService } from './notification.service';
import { NotificationLogService } from './notification-log.service';
import { NotificationLogController } from './notification-log.controller';

@Global()
@Module({
  controllers: [NotificationLogController],
  providers: [WxAccessTokenService, WxNotifyService, NotificationService, NotificationLogService],
  exports: [NotificationService, WxNotifyService, WxAccessTokenService, NotificationLogService],
})
export class NotificationModule {}
