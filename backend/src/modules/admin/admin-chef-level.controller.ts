import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from './admin.guard';
import { AdminChefLevelService } from './admin-chef-level.service';

@ApiTags('Admin · Chef Level')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/chef-levels')
export class AdminChefLevelController {
  constructor(private readonly chefLevelService: AdminChefLevelService) {}

  @Get()
  @ApiOperation({ summary: '厨师等级列表' })
  list() {
    return this.chefLevelService.list();
  }

  @Get('seed')
  @ApiOperation({ summary: '重新初始化种子数据' })
  seed() {
    return this.chefLevelService.seed();
  }

  @Get(':key')
  @ApiOperation({ summary: '厨师等级详情' })
  get(@Param('key') key: string) {
    return this.chefLevelService.get(key);
  }

  @Post()
  @ApiOperation({ summary: '新增厨师等级' })
  create(
    @Body()
    body: {
      key: string;
      title: string;
      emoji: string;
      minOrders?: number;
      minAvgRating?: number;
      sortOrder?: number;
    },
  ) {
    return this.chefLevelService.create(body);
  }

  @Patch(':key')
  @ApiOperation({ summary: '编辑厨师等级' })
  update(
    @Param('key') key: string,
    @Body()
    body: {
      title?: string;
      emoji?: string;
      minOrders?: number;
      minAvgRating?: number;
      sortOrder?: number;
    },
  ) {
    return this.chefLevelService.update(key, body);
  }

  @Patch(':key/toggle')
  @ApiOperation({ summary: '启用/停用厨师等级' })
  toggle(@Param('key') key: string) {
    return this.chefLevelService.toggle(key);
  }

  @Delete(':key')
  @ApiOperation({ summary: '删除厨师等级' })
  remove(@Param('key') key: string) {
    return this.chefLevelService.remove(key);
  }
}
