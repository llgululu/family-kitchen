import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/auth';
import { tokenStorage } from '@/api/http';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(tokenStorage.get());
  const username = ref<string | null>(localStorage.getItem('admin_username'));

  const isLoggedIn = computed(() => !!token.value);

  async function login(u: string, p: string): Promise<void> {
    const result = await authApi.adminLogin(u, p);
    token.value = result.token;
    username.value = result.username;
    tokenStorage.set(result.token);
    localStorage.setItem('admin_username', result.username);
  }

  function logout(): void {
    token.value = null;
    username.value = null;
    tokenStorage.clear();
    localStorage.removeItem('admin_username');
  }

  return { token, username, isLoggedIn, login, logout };
});
