import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { AdminGuard } from '../admin/admin.guard';

@Module({
  controllers: [FeedbackController],
  providers: [FeedbackService, AdminGuard],
})
export class FeedbackModule {}
