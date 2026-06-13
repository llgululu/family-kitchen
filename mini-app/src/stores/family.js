import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { familyApi } from '@/api/family.js';

export const useFamilyStore = defineStore('family', () => {
  const family = ref(null);
  const loading = ref(false);

  const hasFamily = computed(() => !!family.value);
  const members = computed(() => family.value?.members ?? []);
  const myRole = computed(() => family.value?.myRole ?? null);
  const isCreator = computed(() => myRole.value === 'creator');

  async function refresh() {
    loading.value = true;
    try {
      family.value = await familyApi.getMine();
    } catch {
      family.value = null;
    } finally {
      loading.value = false;
    }
    return family.value;
  }

  async function create(data) {
    family.value = await familyApi.create(data);
    return family.value;
  }

  async function joinByCode(code) {
    family.value = await familyApi.joinByCode(code);
    return family.value;
  }

  async function updateMine(data) {
    family.value = await familyApi.updateMine(data);
    return family.value;
  }

  async function leave() {
    await familyApi.leave();
    family.value = null;
  }

  function clear() {
    family.value = null;
  }

  return {
    family,
    loading,
    hasFamily,
    members,
    myRole,
    isCreator,
    refresh,
    create,
    joinByCode,
    updateMine,
    leave,
    clear,
  };
});
