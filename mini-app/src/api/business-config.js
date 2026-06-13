import { http } from './http';

/** 拉取后端公开的运行时业务配置（无需鉴权） */
export function fetchPublicConfig() {
  return http.get('/config/public', undefined, { silent: true });
}
