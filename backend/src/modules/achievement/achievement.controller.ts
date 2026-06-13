import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AchievementService } from './achievement.service';
import { AchievementDto } from './dto/achievement.dto';
import { CurrentUser, type AuthUser } from '../../common/current-user.decorator';

@ApiTags('Achievement')
@ApiBearerAuth()
@Controller('achievements')
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  @Get('me')
  @ApiOperation({ summary: '我的个人成就' })
  listMine(@CurrentUser() user: AuthUser): Promise<AchievementDto[]> {
    return this.achievementService.listMine(user.userId);
  }

  @Get('family')
  @ApiOperation({ summary: '当前家庭的成就' })
  listFamily(@CurrentUser() user: AuthUser): Promise<AchievementDto[]> {
    return this.achievementService.listFamily(user.userId);
  }

  @Get('progress')
  @ApiOperation({ summary: '成就进度（含未解锁徽章的进度信息）' })
  getProgress(@CurrentUser() user: AuthUser) {
    return this.achievementService.getProgress(user.userId);
  }
}
