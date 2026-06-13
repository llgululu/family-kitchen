import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LovePointService } from './love-point.service';
import {
  LovePointBalanceDto,
  LovePointLogDto,
  LovePointLogQueryDto,
} from './dto/love-point-log.dto';
import { CurrentUser, type AuthUser } from '../../common/current-user.decorator';
import type { PaginatedResponseDto } from '../../common/pagination.dto';

@ApiTags('LovePoint')
@ApiBearerAuth()
@Controller('love-points')
export class LovePointController {
  constructor(private readonly lovePointService: LovePointService) {}

  @Get('balance')
  @ApiOperation({ summary: '我的爱心币余额 + 本月统计' })
  getBalance(@CurrentUser() user: AuthUser): Promise<LovePointBalanceDto> {
    return this.lovePointService.getMyBalance(user.userId);
  }

  @Get('logs')
  @ApiOperation({ summary: '爱心币流水（可切个人 / 家庭账本）' })
  getLogs(
    @CurrentUser() user: AuthUser,
    @Query() query: LovePointLogQueryDto,
  ): Promise<PaginatedResponseDto<LovePointLogDto>> {
    return this.lovePointService.getMyLogs(user.userId, query);
  }

  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '每日签到（+2 爱心币）' })
  checkIn(@CurrentUser() user: AuthUser): Promise<{ earned: number }> {
    return this.lovePointService.checkIn(user.userId);
  }

  @Post('logs/:id/reverse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '撤回打赏（仅 24h 内，发起人本人）',
  })
  reverseLog(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<{ refunded: number }> {
    return this.lovePointService.reverseLog(user.userId, id).then((logs) => ({
      refunded: logs[0]?.changeAmount ?? 0,
    }));
  }
}
