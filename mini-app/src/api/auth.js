import { http } from './http.js';

export const authApi = {
  /** @param {string} code wx.login() 拿到的 code
   *  @param {string} [gender] 'male' | 'female' */
  wxLogin(code, gender) {
    return http.post('/auth/wx-login', { code, gender });
  },
  /** H5：手机号 + 密码登录 / 注册
   *  @param {string} phone 手机号
   *  @param {string} password 密码
   *  @param {string} [gender] 'male' | 'female'（仅首次注册用） */
  passwordLogin(phone, password, gender) {
    return http.post('/auth/password-login', { phone, password, gender });
  },
};
