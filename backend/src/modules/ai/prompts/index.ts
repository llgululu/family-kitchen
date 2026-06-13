/** 菜谱生成 prompt */
export function buildRecipeGenPrompt(context: {
  ingredients: string[];
  mealTag?: string;
  flavorTag?: string;
  difficulty?: number;
  notes?: string;
  existingRecipeNames: string[];
}): { system: string; user: string } {
  const system = `你是一位经验丰富的家庭厨师。你的任务是根据用户提供的食材生成一道美味的家常菜菜谱。
请以 JSON 格式返回，包含以下字段：
- name: 菜名（不超过30字）
- ingredients: 所需食材数组（含用量，如 "番茄 2个"）
- steps: 烹饪步骤数组（每步不超过100字，按顺序排列）
- difficulty: 难度（1-5）
- cookingTimeMinutes: 预计烹饪时间（分钟）
- tips: 小贴士数组（实用烹饪技巧）

只返回 JSON，不要任何其他文字。`;

  const parts: string[] = [];
  parts.push(`我有以下食材：${context.ingredients.join('、')}`);
  if (context.mealTag) parts.push(`适合${context.mealTag}时段`);
  if (context.flavorTag) parts.push(`偏好${context.flavorTag}口味`);
  if (context.difficulty) parts.push(`难度${context.difficulty}级`);
  if (context.notes) parts.push(`补充说明：${context.notes}`);
  if (context.existingRecipeNames.length > 0) {
    parts.push(`以下是我们已有的菜谱（请避免重复或太相似）：${context.existingRecipeNames.join('、')}`);
  }

  return { system, user: parts.join('。') + '。请生成一道菜谱。' };
}

/** 智能推荐 prompt */
export function buildRecommendPrompt(context: {
  mealTag?: string;
  servings?: number;
  preference?: string;
  existingRecipes: Array<{ id: string; name: string; avgRating: number | null; difficulty: number; mealTags: string[]; flavorTags: string[] }>;
  recentOrderNames: string[];
  timeOfDay: string;
  isWeekend: boolean;
}): { system: string; user: string } {
  const system = `你是一位贴心的家庭美食顾问。根据家庭已有的菜谱、历史偏好和当前场景，推荐3-5道菜。
请以 JSON 数组格式返回推荐结果，每个元素包含：
- recipeId: 已有菜谱的 ID（如果是已有菜谱），新菜谱则为 null
- name: 菜名
- reason: 推荐理由（30字以内）
- matchScore: 匹配度（0-100）
- isExistingRecipe: 是否为已有菜谱（boolean）
- ingredients: 如果是新菜谱，列出主要食材；已有菜谱可为空数组

只返回 JSON 数组，不要任何其他文字。`;

  const parts: string[] = [];
  parts.push(`当前时段：${context.timeOfDay}${context.isWeekend ? '（周末）' : '（工作日）'}`);
  if (context.mealTag) parts.push(`餐段：${context.mealTag}`);
  if (context.servings) parts.push(`用餐人数：${context.servings}`);
  if (context.preference) parts.push(`偏好：${context.preference}`);

  if (context.existingRecipes.length > 0) {
    parts.push('家庭已有菜谱：');
    for (const r of context.existingRecipes.slice(0, 30)) {
      parts.push(`  - [${r.id}] ${r.name} (评分${r.avgRating ?? '暂无'}, 难度${r.difficulty}, ${r.mealTags.join('/')} ${r.flavorTags.join('/')})`);
    }
  }

  if (context.recentOrderNames.length > 0) {
    parts.push(`最近14天做过：${context.recentOrderNames.join('、')}（避免重复推荐）`);
  }

  return { system, user: parts.join('\n') + '\n\n请给出推荐。' };
}

/** 厨艺助手 prompt */
export function buildCookingAssistantPrompt(context: {
  recipeName: string;
  recipeSteps: string[];
  difficulty: number;
  cookingTimeMinutes: number | null;
  orderStatus: string;
  userRole: string;
  previousMessages: Array<{ role: string; content: string }>;
}): { system: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> } {
  const system = `你是一位耐心的家庭厨艺指导助手，正在实时指导用户做菜。
当前菜谱信息：
- 菜名：${context.recipeName}
- 难度：${context.difficulty}/5
- 预计时间：${context.cookingTimeMinutes ?? '未知'}分钟
- 烹饪步骤：${context.recipeSteps.map((s, i) => `${i + 1}. ${s}`).join('；')}
- 订单状态：${context.orderStatus}
- 用户角色：${context.userRole}

请用简洁、鼓励的语气回答用户问题。回答控制在100字以内。`;

  return {
    system,
    messages: context.previousMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  };
}

/** 营养分析 prompt */
export function buildNutritionPrompt(context: {
  recipes: Array<{ name: string; ingredients: string[]; difficulty: number }>;
}): { system: string; user: string } {
  const system = `你是一位专业的营养师。分析以下菜谱的营养成分，给出评估。
请以 JSON 格式返回：
{
  "recipes": [
    {
      "name": "菜名",
      "calories": 估算热量(kcal),
      "protein": 蛋白质(g),
      "carbs": 碳水(g),
      "fat": 脂肪(g),
      "fiber": 膳食纤维(g),
      "vitamins": ["主要维生素"]
    }
  ],
  "totalNutrition": { "calories": 总热量, "protein": 总蛋白质, "carbs": 总碳水, "fat": 总脂肪 },
  "balanceScore": 均衡评分(0-100),
  "suggestions": ["营养建议"]
}

只返回 JSON，不要任何其他文字。`;

  const user = context.recipes
    .map((r) => `菜谱：${r.name}\n食材：${r.ingredients.join('、')}\n难度：${r.difficulty}/5`)
    .join('\n\n');

  return { system, user: user + '\n\n请分析以上菜谱的营养成分。' };
}

/** 一周菜单规划 prompt */
export function buildWeeklyPlanPrompt(context: {
  preference?: string;
  servings?: number;
  existingRecipes: Array<{ id: string; name: string; difficulty: number; mealTags: string[] }>;
}): { system: string; user: string } {
  const system = `你是一位家庭营养规划师。为家庭制定一周均衡的菜单。
请以 JSON 格式返回：
{
  "days": [
    {
      "day": "周一",
      "meals": {
        "breakfast": { "recipeId": "已有菜谱ID或null", "name": "菜名", "calories": 估算热量 },
        "lunch": { "recipeId": "已有菜谱ID或null", "name": "菜名", "calories": 估算热量 },
        "dinner": { "recipeId": "已有菜谱ID或null", "name": "菜名", "calories": 估算热量 }
      }
    }
  ],
  "totalWeekCalories": 一周总热量,
  "balanceScore": 均衡评分(0-100),
  "shoppingList": ["采购清单"],
  "suggestions": ["规划建议"]
}

优先使用已有菜谱，合理搭配荤素。只返回 JSON。`;

  const parts: string[] = [];
  if (context.preference) parts.push(`偏好：${context.preference}`);
  if (context.servings) parts.push(`用餐人数：${context.servings}`);
  if (context.existingRecipes.length > 0) {
    parts.push('已有菜谱：');
    for (const r of context.existingRecipes) {
      parts.push(`  - [${r.id}] ${r.name} (难度${r.difficulty}, ${r.mealTags.join('/')})`);
    }
  }

  return { system, user: parts.join('\n') + '\n\n请制定一周菜单。' };
}
