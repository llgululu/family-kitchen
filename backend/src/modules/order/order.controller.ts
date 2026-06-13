import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { RatingService } from './rating.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AcceptOrderDto } from './dto/accept-order.dto';
import { RejectOrderDto } from './dto/reject-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ServeOrderDto } from './dto/serve-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrderDto } from './dto/order.dto';
import { CreateRatingDto, RatingSettlementResultDto } from './dto/create-rating.dto';
import { CurrentUser, type AuthUser } from '../../common/current-user.decorator';
import type { PaginatedResponseDto } from '../../common/pagination.dto';

@ApiTags('Order')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly ratingService: RatingService,
  ) {}

  @Post()
  @ApiOperation({ summary: '食客创建订单' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto): Promise<OrderDto> {
    return this.orderService.create(user.userId, dto);
  }

  @Get('active')
  @ApiOperation({ summary: '获取当前活跃订单（一家庭一活跃单）' })
  getActive(@CurrentUser() user: AuthUser): Promise<OrderDto | null> {
    return this.orderService.findActive(user.userId);
  }

  @Get()
  @ApiOperation({ summary: '订单列表（分页 + 状态/角色筛选）' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: OrderQueryDto,
  ): Promise<PaginatedResponseDto<OrderDto>> {
    return this.orderService.findAll(user.userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '订单详情' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<OrderDto> {
    return this.orderService.findOne(user.userId, id);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '厨师接单（可同时调整期望时间）' })
  accept(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AcceptOrderDto,
  ): Promise<OrderDto> {
    return this.orderService.accept(user.userId, id, dto);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '厨师拒单' })
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectOrderDto,
  ): Promise<OrderDto> {
    return this.orderService.reject(user.userId, id, dto);
  }

  @Post(':id/prepping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '厨师标记：开始备菜' })
  setPrepping(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<OrderDto> {
    return this.orderService.setPrepping(user.userId, id);
  }

  @Post(':id/cooking')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '厨师标记：开始烹饪' })
  setCooking(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<OrderDto> {
    return this.orderService.setCooking(user.userId, id);
  }

  @Post(':id/serve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '厨师上菜（必须附图）' })
  serve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ServeOrderDto,
  ): Promise<OrderDto> {
    return this.orderService.serve(user.userId, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '食客或厨师取消订单（已上菜后不可取消）' })
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ): Promise<OrderDto> {
    return this.orderService.cancel(user.userId, id, dto);
  }

  @Post(':id/rating')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '食客评价 + 一气呵成结算：状态→completed、发放爱心币、生成时间线条目',
  })
  rate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateRatingDto,
  ): Promise<RatingSettlementResultDto> {
    return this.ratingService.create(user.userId, id, dto);
  }
}
