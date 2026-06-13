import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from './admin.guard';
import { AdminBadgeService, BadgeQueryDtoImpl } from './admin-badge.service';

@ApiTags('Admin · Badge')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/badges')
export class AdminBadgeController {
  constructor(private readonly badgeService: AdminBadgeService) {}

  @Get()
  @ApiOperation({ summary: '徽章定义列表' })
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const query = new BadgeQueryDtoImpl(
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
      category,
      isActive !== undefined ? isActive === 'true' : undefined,
      search,
    );
    return this.badgeService.list(query);
  }

  @Get('seed')
  @ApiOperation({ summary: '重新初始化种子数据' })
  seed() {
    return this.badgeService.seed();
  }

  @Get(':key')
  @ApiOperation({ summary: '徽章定义详情' })
  get(@Param('key') key: string) {
    return this.badgeService.get(key);
  }

  @Post()
  @ApiOperation({ summary: '新增徽章定义' })
  create(
    @Body()
    body: {
      key: string;
      title: string;
      description: string;
      emoji: string;
      category: string;
      ownerType: string;
      triggerType: string;
      evaluatorType: string;
      evaluatorConfig: Record<string, unknown>;
      hidden?: boolean;
      progressTarget?: number | null;
      sortOrder?: number;
    },
  ) {
    return this.badgeService.create(body);
  }

  @Patch(':key')
  @ApiOperation({ summary: '编辑徽章定义' })
  update(
    @Param('key') key: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      emoji?: string;
      category?: string;
      ownerType?: string;
      triggerType?: string;
      evaluatorType?: string;
      evaluatorConfig?: Record<string, unknown>;
      hidden?: boolean;
      progressTarget?: number | null;
      sortOrder?: number;
    },
  ) {
    return this.badgeService.update(key, body);
  }

  @Patch(':key/toggle')
  @ApiOperation({ summary: '启用/停用徽章' })
  toggle(@Param('key') key: string) {
    return this.badgeService.toggle(key);
  }

  @Delete(':key')
  @ApiOperation({ summary: '删除徽章定义' })
  remove(@Param('key') key: string) {
    return this.badgeService.remove(key);
  }

  @Get(':key/stats')
  @ApiOperation({ summary: '徽章解锁统计' })
  stats(@Param('key') key: string) {
    return this.badgeService.getStats(key);
  }
}
