import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MessageService } from './message.service';
import { CreateMessageDto, MessageDto } from './dto/create-message.dto';
import { CurrentUser, type AuthUser } from '../../common/current-user.decorator';
import { PaginationQueryDto, type PaginatedResponseDto } from '../../common/pagination.dto';

@ApiTags('Order Message')
@ApiBearerAuth()
@Controller('orders/:orderId/messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get()
  @ApiOperation({ summary: '订单内消息流' })
  list(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<MessageDto>> {
    return this.messageService.list(user.userId, orderId, query);
  }

  @Post()
  @ApiOperation({
    summary: '发送消息（text / emoji / image / rush 催菜 / tip 打赏）',
  })
  send(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() dto: CreateMessageDto,
  ): Promise<MessageDto> {
    return this.messageService.send(user.userId, orderId, dto);
  }

  @Post('read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '标记对方发送的未读消息为已读' })
  markRead(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.messageService.markRead(user.userId, orderId).then((ids) => ({ affectedIds: ids }));
  }
}
