import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';

export const useChatUnreadStore = defineStore('chatUnread', () => {
  // orderId -> count
  const unreadMap = reactive(new Map());

  const totalUnread = computed(() => {
    let sum = 0;
    for (const count of unreadMap.values()) sum += count;
    return sum;
  });

  function increment(orderId) {
    const cur = unreadMap.get(orderId) || 0;
    unreadMap.set(orderId, cur + 1);
  }

  function clearOrder(orderId) {
    unreadMap.delete(orderId);
  }

  function setCount(orderId, count) {
    if (count > 0) unreadMap.set(orderId, count);
    else unreadMap.delete(orderId);
  }

  function clearAll() {
    unreadMap.clear();
  }

  function getCount(orderId) {
    return unreadMap.get(orderId) || 0;
  }

  return { unreadMap, totalUnread, increment, clearOrder, setCount, clearAll, getCount };
});
