import { defineStore } from 'pinia';
import { ref } from 'vue';
import { orderApi } from '@/api/order.js';

export const useActiveOrderStore = defineStore('activeOrder', () => {
  const order = ref(null);
  const loading = ref(false);

  async function refresh() {
    loading.value = true;
    try {
      order.value = await orderApi.getActive();
    } catch {
      order.value = null;
    } finally {
      loading.value = false;
    }
    return order.value;
  }

  function clear() {
    order.value = null;
  }

  return { order, loading, refresh, clear };
});
