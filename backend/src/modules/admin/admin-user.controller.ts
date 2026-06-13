import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from './admin.guard';
import { AdminUserService } from './admin-user.service';
import { AdminUserQueryDto } from './dto/admin-resource.dto';
import { PaginationQueryDto } from '../../common/pagination.dto';

@ApiTags('Admin · User')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/users')
export class AdminUserController {
  constructor(private readonly userService: AdminUserService) {}

  @Get()
  @ApiOperation({ summary: '用户列表' })
  list(@Query() query: AdminUserQueryDto) {
    return this.userService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '用户详情：含余额 + 成就数 + 注销状态' })
  detail(@Param('id') id: string) {
    return this.userService.detail(id);
  }

  @Get(':id/love-point-logs')
  @ApiOperation({ summary: '用户爱心币流水' })
  listLovePointLogs(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.userService.listLovePointLogs(id, query);
  }

  @Get(':id/achievements')
  @ApiOperation({ summary: '用户解锁的徽章' })
  listAchievements(@Param('id') id: string) {
    return this.userService.listAchievements(id);
  }

  @Get(':id/orders')
  @ApiOperation({ summary: '用户参与的订单（食客或厨师）' })
  listOrders(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.userService.listOrders(id, query);
  }
}
