import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import {
  CreateFeedbackDto,
  FeedbackDto,
  FeedbackQueryDto,
  UpdateFeedbackStatusDto,
} from './dto/feedback.dto';
import { CurrentUser, type AuthUser } from '../../common/current-user.decorator';
import { AdminGuard } from '../admin/admin.guard';
import type { PaginatedResponseDto } from '../../common/pagination.dto';

@ApiTags('Feedback')
@ApiBearerAuth()
@Controller()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('feedback')
  @ApiOperation({ summary: '提交反馈（任何登录用户）' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFeedbackDto): Promise<FeedbackDto> {
    return this.feedbackService.create(user.userId, dto);
  }

  @Get('admin/feedback')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '反馈列表（admin）' })
  list(@Query() query: FeedbackQueryDto): Promise<PaginatedResponseDto<FeedbackDto>> {
    return this.feedbackService.list(query);
  }

  @Patch('admin/feedback/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '修改反馈状态（admin）' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackStatusDto,
  ): Promise<FeedbackDto> {
    return this.feedbackService.updateStatus(id, dto);
  }
}
