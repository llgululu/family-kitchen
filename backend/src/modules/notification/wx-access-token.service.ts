import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface CachedToken {
  token: string;
  expiresAt: number;
}

interface WxTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

/**
 * 缓存微信开放接口 access_token。
 * - 微信 access_token 有效期 7200 秒，提前 200 秒刷新
 * - 同一进程内并发请求时只发起一次刷新
 */
@Injectable()
export class WxAccessTokenService {
  private readonly logger = new Logger(WxAccessTokenService.name);
  private cache: CachedToken | null = null;
  private inflight: Promise<string> | null = null;

  constructor(private readonly config: ConfigService) {}

  async getToken(): Promise<string> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now + 30_000) {
      return this.cache.token;
    }
    if (this.inflight) {
      return this.inflight;
    }
    this.inflight = this.refresh().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  /** 强制刷新（测试或排障用） */
  async refresh(): Promise<string> {
    const appid = this.config.get<string>('WX_APPID');
    const secret = this.config.get<string>('WX_APP_SECRET');
    if (!appid || !secret) {
      throw new Error('WX_APPID / WX_APP_SECRET 未配置');
    }
    const url = 'https://api.weixin.qq.com/cgi-bin/token';
    const { data } = await axios.get<WxTokenResponse>(url, {
      params: { grant_type: 'client_credential', appid, secret },
      timeout: 10_000,
    });
    if (!data.access_token || !data.expires_in) {
      this.logger.warn(`access_token 获取失败: ${JSON.stringify(data)}`);
      throw new Error(data.errmsg ?? '微信 access_token 获取失败');
    }
    const expiresAt = Date.now() + (data.expires_in - 200) * 1000;
    this.cache = { token: data.access_token, expiresAt };
    this.logger.debug(`access_token 刷新成功，到期 ${new Date(expiresAt).toISOString()}`);
    return data.access_token;
  }
}
