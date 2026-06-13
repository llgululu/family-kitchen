import { http } from './http.js';

export const aiApi = {
  /** AI 菜谱生成 */
  generateRecipe(data) {
    return http.post('/ai/recipes/generate', data);
  },

  /** 保存 AI 生成的菜谱到家庭 */
  saveRecipe(data) {
    return http.post('/ai/recipes/save', data);
  },

  /** AI 智能推荐 */
  recommend(data = {}) {
    return http.post('/ai/recommend', data);
  },

  /** AI 厨艺助手对话 */
  cookingChat(data) {
    return http.post('/ai/cooking-assistant/chat', data);
  },

  /** AI 营养分析 */
  nutritionAnalyze(data) {
    return http.post('/ai/nutrition/analyze', data);
  },

  /** AI 一周菜单规划 */
  weeklyPlan(data = {}) {
    return http.post('/ai/nutrition/weekly-plan', data);
  },
};
