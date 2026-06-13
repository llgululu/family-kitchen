import { defineStore } from 'pinia';
import { fetchPublicConfig } from '@/api/business-config';

// 与 packages/shared/src/constants.ts 保持一致，作为离线/失败兜底。
const DEFAULTS = {
  love_point_formula: {
    BASE: 5,
    DIFFICULTY_MULTIPLIER: 2,
    RATING_BONUS_MULTIPLIER: 2,
    FIVE_STAR_EXTRA_BONUS: 5,
  },
  rush_limits: { MAX_PER_ORDER: 3, COOLDOWN_SECONDS: 300 },
  order_timing: {
    INVITE_CODE_TTL_SECONDS: 86400,
    AUTO_RATE_AFTER_SERVED_SECONDS: 86400,
    MESSAGE_MAX_LENGTH: 200,
    REMIND_CHEF_BEFORE_MINUTES: 15,
  },
  recipe_limits: {
    NAME_MAX_LENGTH: 30,
    NOTES_MAX_LENGTH: 500,
    MAX_IMAGES: 5,
    DIFFICULTY_MIN: 1,
    DIFFICULTY_MAX: 5,
  },
  family_limits: { MAX_MEMBERS: 2, RECOVERY_DAYS: 30 },
  rating_limits: {
    MIN: 1,
    MAX: 5,
    COMMENT_MAX_LENGTH: 500,
    MAX_IMAGES: 3,
  },
  pagination: { DEFAULT_PAGE_SIZE: 20, MAX_PAGE_SIZE: 100 },
  wx_template_ids: {
    ORDER_ACCEPTED: '',
    ORDER_SERVED: '',
    ORDER_RUSHED: '',
    ACHIEVEMENT_UNLOCKED: '',
  },
};

export const useBusinessConfigStore = defineStore('business-config', {
  state: () => ({
    ...JSON.parse(JSON.stringify(DEFAULTS)),
    defaultAvatarMaleUrl: '/static/male.jpg',
    defaultAvatarFemaleUrl: '/static/female.jpg',
    loaded: false,
  }),
  getters: {
    avatarFallback(state) {
      return (gender) =>
        gender === 'female'
          ? state.defaultAvatarFemaleUrl || '/static/female.jpg'
          : state.defaultAvatarMaleUrl || '/static/male.jpg';
    },
  },
  actions: {
    async load() {
      try {
        const data = await fetchPublicConfig();
        if (data && typeof data === 'object') {
          Object.assign(this, data);
        }
        this.loaded = true;
      } catch (e) {
        // 静默失败，继续使用 DEFAULTS
        console.warn('[business-config] public config fetch failed; using bundled defaults', e);
      }
    },
  },
});
