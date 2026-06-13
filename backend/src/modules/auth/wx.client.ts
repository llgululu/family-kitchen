import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface WxJscode2sessionResponse {
  openid: string;
  unionid?: string;
  session_key: string;
  errcode?: number;
  errmsg?: string;
}

/** 封装微信开放接口 */
@Injectable()
export class WxClient {
  private readonly logger = new Logger(WxClient.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * 用 mini-app 的 wx.login code 换取 openid + session_key
   * 文档：https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/login/auth.code2Session.html
   */
  async code2Session(code: string): Promise<WxJscode2sessionResponse> {
    const appid = this.config.get<string>('WX_APPID');
    const secret = this.config.get<string>('WX_APP_SECRET');
    if (!appid || !secret) {
      throw new InternalServerErrorException({
        code: 'WX_CONFIG_MISSING',
        message: 'WX_APPID/WX_APP_SECRET 未配置',
      });
    }
    const url = 'https://api.weixin.qq.com/sns/jscode2session';
    const { data } = await axios.get<WxJscode2sessionResponse>(url, {
      params: { appid, secret, js_code: code, grant_type: 'authorization_code' },
      timeout: 10_000,
    });
    if (!data.openid || data.errcode) {
      this.logger.warn(`wx.code2Session failed: ${JSON.stringify(data)}`);
      throw new InternalServerErrorException({
        code: 'WX_LOGIN_FAILED',
        message: data.errmsg ?? '微信登录失败',
        details: data,
      });
    }
    return data;
  }
}
