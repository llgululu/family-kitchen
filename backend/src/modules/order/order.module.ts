import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { RatingService } from './rating.service';

@Module({
  controllers: [OrderController, MessageController],
  providers: [OrderService, MessageService, RatingService],
  exports: [OrderService, MessageService, RatingService],
})
export class OrderModule {}
