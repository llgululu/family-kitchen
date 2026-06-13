/** 状态枚举到中文展示的映射 */
export const ORDER_STATUS_LABEL: Record<string, string> = {
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

export const ORDER_STATUS_COLOR: Record<string, string> = {
  draft: 'info',
  pending: 'warning',
  accepted: 'primary',
  prepping: 'primary',
  cooking: 'primary',
  served: 'success',
  rated: 'success',
  completed: 'success',
  rejected: 'danger',
  cancelled: 'danger',
};

export const FAMILY_STATUS_LABEL: Record<string, string> = {
  active: '正常',
  dissolving: '解散中',
  dissolved: '已解散',
};

export const FAMILY_STATUS_COLOR: Record<string, string> = {
  active: 'success',
  dissolving: 'warning',
  dissolved: 'danger',
};

export const FEEDBACK_STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  processed: '已处理',
  closed: '已关闭',
};

export const FEEDBACK_STATUS_COLOR: Record<string, string> = {
  pending: 'warning',
  processed: 'success',
  closed: 'info',
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const LOVE_POINT_TYPE_LABEL: Record<string, string> = {
  cook_reward: '做菜奖励',
  rating_bonus: '评分加成',
  tip_send: '打赏（出）',
  tip_receive: '打赏（入）',
  check_in: '签到',
  refund: '撤回退款',
};

export const ORDER_MESSAGE_TYPE_LABEL: Record<string, string> = {
  text: '文字',
  emoji: '表情',
  image: '图片',
  rush: '催菜',
  tip: '打赏',
  system: '系统',
};

export const BADGE_LABEL: Record<string, { title: string; description: string }> = {
  family_first_dish: { title: '第一道菜', description: '家庭完成第 1 道菜' },
  family_10_dishes: { title: '家庭第 10 道菜', description: '家庭累计 10 道菜' },
  family_100_dishes: { title: '家庭第 100 道菜', description: '家庭累计 100 道菜' },
  family_365_dishes: { title: '家庭第 365 道菜', description: '家庭累计 365 道菜' },
  chef_first_dish: { title: '厨师初体验', description: '厨师第 1 道菜' },
  chef_10_dishes: { title: '厨师小学徒', description: '厨师第 10 道菜' },
  chef_100_dishes: { title: '厨师大师傅', description: '厨师第 100 道菜' },
  five_star_streak_5: { title: '五星连击 ×5', description: '连续 5 次拿到 5 星' },
};
