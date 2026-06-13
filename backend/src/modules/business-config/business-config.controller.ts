import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../admin/admin.guard';
import { CurrentUser, type AuthUser } from '../../common/current-user.decorator';
import { PaginationQueryDto } from '../../common/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessConfigService } from './business-config.service';
import { ALL_GROUP_KEYS, type GroupKey } from './config-registry';

@ApiTags('admin/business-config')
@Controller('admin/business-config')
@UseGuards(AdminGuard)
export class BusinessConfigController {
  constructor(
    private readonly svc: BusinessConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: '取全部 group 当前值 + 元信息' })
  async getAll() {
    const rows = await this.prisma.businessConfig.findMany();
    return rows.map((r) => ({
      groupKey: r.groupKey,
      value: r.value,
      schemaVersion: r.schemaVersion,
      updatedAt: r.updatedAt,
      updatedBy: r.updatedBy,
    }));
  }

  @Get('-/changes/all')
  @ApiOperation({ summary: '全部 group 的变更历史' })
  async listAllChanges(@Query() page: PaginationQueryDto) {
    return this.svc.listChanges({ page: page.page, pageSize: page.pageSize });
  }

  @Get(':groupKey')
  @ApiOperation({ summary: '取单 group 当前值' })
  async getOne(@Param('groupKey') groupKey: string) {
    this.assertGroupKey(groupKey);
    const row = await this.prisma.businessConfig.findUnique({ where: { groupKey } });
    if (!row) throw new BadRequestException(`group ${groupKey} not found`);
    return row;
  }

  @Patch(':groupKey')
  @ApiOperation({ summary: '整组覆盖更新' })
  async update(
    @Param('groupKey') groupKey: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthUser,
  ) {
    this.assertGroupKey(groupKey);
    const value = await this.svc.update(groupKey as GroupKey, body, user.userId);
    return { groupKey, value };
  }

  @Get(':groupKey/changes')
  @ApiOperation({ summary: '单 group 的变更历史' })
  async listGroupChanges(
    @Param('groupKey') groupKey: string,
    @Query() page: PaginationQueryDto,
  ) {
    this.assertGroupKey(groupKey);
    return this.svc.listChanges({
      groupKey: groupKey as GroupKey,
      page: page.page,
      pageSize: page.pageSize,
    });
  }

  private assertGroupKey(g: string): void {
    if (!(ALL_GROUP_KEYS as readonly string[]).includes(g)) {
      throw new BadRequestException(`unknown groupKey ${g}`);
    }
  }
}
