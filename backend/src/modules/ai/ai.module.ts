import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiController } from './ai.controller';
import { AdminAiController } from './admin/admin-ai.controller';
import { AiProviderFactory } from './providers/ai-provider.factory';
import { AiUsageService } from './services/ai-usage.service';
import { RecipeGenService } from './services/recipe-gen.service';
import { RecommendService } from './services/recommend.service';
import { CookingAssistantService } from './services/cooking-assistant.service';
import { NutritionService } from './services/nutrition.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AiController, AdminAiController],
  providers: [
    AiProviderFactory,
    AiUsageService,
    RecipeGenService,
    RecommendService,
    CookingAssistantService,
    NutritionService,
  ],
  exports: [
    AiUsageService,
    RecipeGenService,
    RecommendService,
    CookingAssistantService,
    NutritionService,
  ],
})
export class AiModule {}
