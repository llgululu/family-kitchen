import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { requireFamilyId } from '../../common/family-context';
import { CurrentUser, type AuthUser } from '../../common/current-user.decorator';
import { RecipeGenService } from './services/recipe-gen.service';
import { RecommendService } from './services/recommend.service';
import { CookingAssistantService } from './services/cooking-assistant.service';
import { NutritionService } from './services/nutrition.service';
import { GenerateRecipeDto, SmartRecommendDto, CookingAssistantDto, NutritionAnalyzeDto, WeeklyPlanDto } from './dto/ai.dto';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipeGen: RecipeGenService,
    private readonly recommend: RecommendService,
    private readonly assistant: CookingAssistantService,
    private readonly nutrition: NutritionService,
  ) {}

  @Post('recipes/generate')
  @ApiOperation({ summary: 'AI 菜谱生成' })
  async generateRecipe(@CurrentUser() user: AuthUser, @Body() dto: GenerateRecipeDto) {
    const familyId = await requireFamilyId(this.prisma, user.userId);
    return this.recipeGen.generate(user.userId, familyId, dto);
  }

  @Post('recipes/save')
  @ApiOperation({ summary: '保存 AI 生成的菜谱到家庭' })
  async saveRecipe(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name: string;
      ingredients: string[];
      steps: string[];
      difficulty: number;
      cookingTimeMinutes?: number;
      tips?: string[];
      mealTags?: string[];
      flavorTags?: string[];
    },
  ) {
    const familyId = await requireFamilyId(this.prisma, user.userId);
    return this.recipeGen.saveToFamily(user.userId, familyId, body);
  }

  @Post('recommend')
  @ApiOperation({ summary: 'AI 智能推荐' })
  async smartRecommend(@CurrentUser() user: AuthUser, @Body() dto: SmartRecommendDto) {
    const familyId = await requireFamilyId(this.prisma, user.userId);
    return this.recommend.recommend(user.userId, familyId, dto);
  }

  @Post('cooking-assistant/chat')
  @ApiOperation({ summary: 'AI 厨艺助手对话' })
  async cookingChat(@CurrentUser() user: AuthUser, @Body() dto: CookingAssistantDto) {
    const familyId = await requireFamilyId(this.prisma, user.userId);
    return this.assistant.chat(user.userId, familyId, dto);
  }

  @Post('nutrition/analyze')
  @ApiOperation({ summary: 'AI 营养分析' })
  async nutritionAnalyze(@CurrentUser() user: AuthUser, @Body() dto: NutritionAnalyzeDto) {
    const familyId = await requireFamilyId(this.prisma, user.userId);
    return this.nutrition.analyze(user.userId, familyId, dto);
  }

  @Post('nutrition/weekly-plan')
  @ApiOperation({ summary: 'AI 一周菜单规划' })
  async weeklyPlan(@CurrentUser() user: AuthUser, @Body() dto: WeeklyPlanDto) {
    const familyId = await requireFamilyId(this.prisma, user.userId);
    return this.nutrition.weeklyPlan(user.userId, familyId, dto);
  }
}
