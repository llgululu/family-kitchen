import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationLogService } from './notification-log.service';
import { CurrentUser, type AuthUser } from '../../common/current-user.decorator';
import { PaginationQueryDto } from '../../common/pagination.dto';
import type { PaginatedResponseDto } from '../../common/pagination.dto';
import type { NotificationLogItem } from './notification-log.service';

@ApiTags('Notification')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationLogController {
  constructor(private readonly notificationLogService: NotificationLogService) {}

  @Get('unread-count')
  @ApiOperation({ summary: '未读通知数' })
  getUnreadCount(@CurrentUser() user: AuthUser): Promise<{ count: number }> {
    return this.notificationLogService.findUnreadCount(user.userId).then((count) => ({ count }));
  }

  @Get()
  @ApiOperation({ summary: '通知列表（分页）' })
  getLogs(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<NotificationLogItem>> {
    return this.notificationLogService.findMyLogs(user.userId, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '标记单条通知已读' })
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<{ ok: true }> {
    return this.notificationLogService.markRead(user.userId, id).then(() => ({ ok: true }));
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '全部标记已读' })
  markAllRead(@CurrentUser() user: AuthUser): Promise<{ ok: true }> {
    return this.notificationLogService.markAllRead(user.userId).then(() => ({ ok: true }));
  }
}
