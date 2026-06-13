import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from './admin.guard';
import { AdminOrderService } from './admin-order.service';
import type { UserNameInfo } from './admin-order.service';
import { AdminOrderQueryDto, AdminOrderSummaryDto, FreezeOrderDto } from './dto/admin-resource.dto';

@ApiTags('Admin · Order')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/orders')
export class AdminOrderController {
  constructor(private readonly orderService: AdminOrderService) {}

  @Get()
  @ApiOperation({ summary: '订单列表（跨家庭，含双方昵称）' })
  list(
    @Query() query: AdminOrderQueryDto,
  ): Promise<
    import('../../common/pagination.dto').PaginatedResponseDto<
      AdminOrderSummaryDto & { customer: UserNameInfo; chef: UserNameInfo }
    >
  > {
    return this.orderService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '订单详情（含 items / rating / 上菜图 / 双方昵称）' })
  detail(@Param('id') id: string) {
    return this.orderService.detail(id);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: '订单内消息流（admin 视角，含发送人昵称）' })
  listMessages(@Param('id') id: string) {
    return this.orderService.listMessages(id);
  }

  @Post(':id/freeze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '强制冻结（cancelled）订单' })
  freeze(@Param('id') id: string, @Body() dto: FreezeOrderDto): Promise<AdminOrderSummaryDto> {
    return this.orderService.freeze(id, dto);
  }
}
