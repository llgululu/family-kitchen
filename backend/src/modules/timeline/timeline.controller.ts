import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TimelineService } from './timeline.service';
import {
  CreateManualEntryDto,
  ReplyTimelineEntryDto,
  TimelineEntryDto,
  TimelineQueryDto,
} from './dto/timeline-entry.dto';
import { MonthlySummaryDto, MonthlySummaryQueryDto } from './dto/monthly-summary.dto';
import { CurrentUser, type AuthUser } from '../../common/current-user.decorator';
import type { PaginatedResponseDto } from '../../common/pagination.dto';

@ApiTags('Timeline')
@ApiBearerAuth()
@Controller('timeline')
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Get()
  @ApiOperation({ summary: '时间线列表（家庭维度，分页）' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: TimelineQueryDto,
  ): Promise<PaginatedResponseDto<TimelineEntryDto>> {
    return this.timelineService.list(user.userId, query);
  }

  @Get('monthly-summary')
  @ApiOperation({
    summary: '月度回顾：本月或指定月的聚合数据（订单数 / Top 菜 / 双方贡献 / 徽章）',
  })
  monthlySummary(
    @CurrentUser() user: AuthUser,
    @Query() query: MonthlySummaryQueryDto,
  ): Promise<MonthlySummaryDto> {
    return this.timelineService.monthlySummary(user.userId, query.month);
  }

  @Post('manual')
  @ApiOperation({ summary: '手动补记一条（不挂订单）' })
  createManual(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateManualEntryDto,
  ): Promise<TimelineEntryDto> {
    return this.timelineService.createManual(user.userId, dto);
  }

  @Patch(':id/reply')
  @ApiOperation({ summary: '回复手动补记条目（仅伴侣可回复一次）' })
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReplyTimelineEntryDto,
  ): Promise<TimelineEntryDto> {
    return this.timelineService.reply(user.userId, id, dto);
  }

  @Patch(':id/hide')
  @ApiOperation({ summary: '对自己隐藏（对方仍可见）' })
  hide(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<TimelineEntryDto> {
    return this.timelineService.hide(user.userId, id);
  }

  @Patch(':id/unhide')
  @ApiOperation({ summary: '取消隐藏' })
  unhide(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<TimelineEntryDto> {
    return this.timelineService.unhide(user.userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除手动补记的条目（订单条目只能隐藏）' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<{ id: string; deleted: true }> {
    return this.timelineService.remove(user.userId, id);
  }
}
