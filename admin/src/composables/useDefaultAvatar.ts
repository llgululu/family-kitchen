import { ref } from 'vue';
import { http } from '@/api/http';

const maleUrl = ref('/male.jpg');
const femaleUrl = ref('/female.jpg');
let loaded = false;

export function useDefaultAvatar() {
  if (!loaded) {
    loaded = true;
    http
      .get<{ defaultAvatarMaleUrl: string; defaultAvatarFemaleUrl: string }>('/config/public')
      .then((r) => {
        if (r.defaultAvatarMaleUrl) maleUrl.value = r.defaultAvatarMaleUrl;
        if (r.defaultAvatarFemaleUrl) femaleUrl.value = r.defaultAvatarFemaleUrl;
      })
      .catch(() => {});
  }

  function avatarUrl(avatar: string | null | undefined, gender?: string | null): string {
    return avatar || (gender === 'female' ? femaleUrl.value : maleUrl.value);
  }

  return { maleUrl, femaleUrl, avatarUrl };
}
