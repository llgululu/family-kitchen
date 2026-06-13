import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from './admin.guard';
import { AdminFamilyService } from './admin-family.service';
import { AdminFamilyQueryDto } from './dto/admin-resource.dto';
import { PaginationQueryDto } from '../../common/pagination.dto';

@ApiTags('Admin · Family')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/families')
export class AdminFamilyController {
  constructor(private readonly familyService: AdminFamilyService) {}

  @Get()
  @ApiOperation({ summary: '家庭空间列表（跨家庭）' })
  list(@Query() query: AdminFamilyQueryDto) {
    return this.familyService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '家庭空间详情：含成员 + 最近 10 单' })
  detail(@Param('id') id: string) {
    return this.familyService.detail(id);
  }

  @Get(':id/love-point-ledger')
  @ApiOperation({ summary: '家庭爱心币账本（跨成员）' })
  ledger(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.familyService.listLedger(id, query);
  }

  @Get(':id/recipes')
  @ApiOperation({ summary: '家庭菜谱' })
  recipes(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.familyService.listRecipes(id, query);
  }

  @Get(':id/achievements')
  @ApiOperation({ summary: '家庭维度成就' })
  achievements(@Param('id') id: string) {
    return this.familyService.listAchievements(id);
  }
}
