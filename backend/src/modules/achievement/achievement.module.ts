import { Global, Module } from '@nestjs/common';
import { AchievementController } from './achievement.controller';
import { AchievementService } from './achievement.service';
import { EvaluatorRegistry } from './evaluator-registry';

@Global()
@Module({
  controllers: [AchievementController],
  providers: [AchievementService, EvaluatorRegistry],
  exports: [AchievementService, EvaluatorRegistry],
})
export class AchievementModule {}
