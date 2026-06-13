export const ORDER_STATUS_LABEL = {
  draft: '草稿',
  pending: '待接单',
  accepted: '已接单',
  prepping: '备菜中',
  cooking: '烹饪中',
  served: '已上菜',
  rated: '已评价',
  completed: '已完成',
  rejected: '已拒绝',
  cancelled: '已取消',
};

export const ORDER_STATUS_COLOR = {
  draft: '#8E8580',
  pending: '#D4A55A',
  accepted: '#6B8FA8',
  prepping: '#6B8FA8',
  cooking: '#6B8FA8',
  served: '#6B9E78',
  rated: '#6B9E78',
  completed: '#6B9E78',
  rejected: '#C75B5B',
  cancelled: '#C75B5B',
};

export const MEAL_TAGS = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'midnight', label: '夜宵' },
];

export const FLAVOR_TAGS = [
  { value: 'sweet', label: '甜' },
  { value: 'salty', label: '咸' },
  { value: 'spicy', label: '辣' },
  { value: 'mild', label: '清淡' },
];

export const LOVE_POINT_TYPE_LABEL = {
  cook_reward: '做菜奖励',
  rating_bonus: '评分加成',
  tip_send: '打赏（出）',
  tip_receive: '打赏（入）',
  check_in: '签到',
  refund: '撤回退款',
};

export const BADGE_CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'chef', label: '厨师' },
  { key: 'customer', label: '吃货' },
  { key: 'recipe', label: '菜谱' },
  { key: 'love', label: '爱心' },
  { key: 'interaction', label: '互动' },
  { key: 'family', label: '家庭' },
];

export const BADGE_LABEL = {
  // 厨师之路
  chef_first_dish: { title: '厨师初体验', emoji: '👨‍🍳' },
  chef_10_dishes: { title: '厨师小学徒', emoji: '🥘' },
  chef_50_dishes: { title: '厨师小当家', emoji: '🍳' },
  chef_100_dishes: { title: '厨师大师傅', emoji: '🎖️' },
  chef_365_dishes: { title: '传说厨神', emoji: '👑' },
  five_star_streak_3: { title: '三星好评', emoji: '✨' },
  five_star_streak_5: { title: '五星连击', emoji: '⭐' },
  five_star_streak_10: { title: '十全十美', emoji: '💫' },
  chef_midnight: { title: '深夜食堂', emoji: '🌙' },
  chef_speed: { title: '闪电大厨', emoji: '⚡' },
  chef_hard_3: { title: '迎难而上', emoji: '💪' },
  // 吃货之路
  customer_first_order: { title: '第一个点单', emoji: '📋' },
  customer_10_orders: { title: '资深吃货', emoji: '🍴' },
  customer_50_orders: { title: '美食鉴赏家', emoji: '🧐' },
  customer_100_orders: { title: '吃货之王', emoji: '👑' },
  rater_first_comment: { title: '第一句点评', emoji: '💬' },
  rater_10_five_stars: { title: '完美主义', emoji: '💯' },
  rater_20_comments: { title: '美食评论家', emoji: '✍️' },
  customer_rush_10: { title: '催菜达人', emoji: '🔔' },
  // 菜谱收藏
  recipe_first_create: { title: '第一道菜谱', emoji: '📝' },
  recipe_5_created: { title: '小小菜谱本', emoji: '📖' },
  recipe_10_created: { title: '家传菜谱', emoji: '📚' },
  recipe_20_created: { title: '菜谱大师', emoji: '🏅' },
  recipe_first_favorite: { title: '首次收藏', emoji: '❤️' },
  recipe_5_favorites: { title: '精选收藏', emoji: '💎' },
  recipe_popular_5: { title: '人气菜品', emoji: '🔥' },
  recipe_popular_20: { title: '招牌菜', emoji: '🌟' },
  recipe_perfect_rating: { title: '满分菜谱', emoji: '🏆' },
  // 爱心温暖
  love_first_earn: { title: '第一颗爱心', emoji: '💕' },
  love_total_100: { title: '爱心满满', emoji: '💌' },
  love_total_500: { title: '爱心银行', emoji: '🏦' },
  love_total_2000: { title: '爱心大亨', emoji: '💰' },
  love_first_tip: { title: '打赏新人', emoji: '🎁' },
  love_tip_10: { title: '慷慨解囊', emoji: '🌹' },
  love_tip_received_10: { title: '甜在心头', emoji: '🍬' },
  // 甜蜜互动
  msg_first_emoji: { title: '第一次互动', emoji: '😘' },
  msg_first_image: { title: '第一张照片', emoji: '📸' },
  msg_first_rush: { title: '等不及了', emoji: '⏰' },
  msg_50_sent: { title: '聊天达人', emoji: '💬' },
  msg_200_sent: { title: '情话绵绵', emoji: '🗨️' },
  msg_kiss_10: { title: '亲亲收集', emoji: '😘' },
  msg_love_10: { title: '爱心收集', emoji: '😍' },
  msg_emoji_all: { title: '表情大师', emoji: '🎭' },
  // 家庭时光
  family_first_dish: { title: '第一道菜', emoji: '🍽️' },
  family_10_dishes: { title: '家庭十道菜', emoji: '🎉' },
  family_50_dishes: { title: '五十道菜', emoji: '🎊' },
  family_100_dishes: { title: '百菜宴', emoji: '💯' },
  family_365_dishes: { title: '一年三餐', emoji: '🏆' },
  family_first_day: { title: '小厨房成立', emoji: '🏠' },
  family_week: { title: '一周纪念', emoji: '📅' },
  family_month: { title: '一月纪念', emoji: '🗓️' },
  family_100_days: { title: '百日纪念', emoji: '💝' },
  family_anniversary: { title: '周年纪念', emoji: '💍' },
  // 隐藏彩蛋
  hidden_valentine: { title: '情人节限定', emoji: '🌹' },
  hidden_new_year: { title: '新年第一餐', emoji: '🧧' },
  hidden_mid_autumn: { title: '月圆人团圆', emoji: '🌕' },
  hidden_christmas: { title: '圣诞大餐', emoji: '🎄' },
  hidden_perfect_day: { title: '完美一天', emoji: '🌈' },
  hidden_take_turns: { title: '默契搭档', emoji: '🤝' },
  hidden_no_rush: { title: '耐心等待', emoji: '🧘' },
};

export const EMOJI_PALETTE = [
  { key: 'kiss', emoji: '😘', label: '亲一下' },
  { key: 'hungry', emoji: '🤤', label: '我饿了' },
  { key: 'love', emoji: '😍', label: '爱了爱了' },
  { key: 'wait', emoji: '⏰', label: '催一下' },
  { key: 'flower', emoji: '💐', label: '送花花' },
  { key: 'cheer', emoji: '🎉', label: '加油' },
  { key: 'pout', emoji: '😤', label: '哼' },
  { key: 'thumbs', emoji: '👍', label: '好厉害' },
];

export function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatTimeShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatRelative(iso) {
  if (!iso) return '';
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.floor((now - t) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  return formatDateTime(iso);
}
