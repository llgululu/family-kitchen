import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { WxAccessTokenService } from './wx-access-token.service';

export interface WxSubscribeMessageInput {
  /** 接收者 openid */
  touser: string;
  /** 模板 ID */
  template_id: string;
  /** 点击跳转的小程序路径（如 pages/order/detail?id=xxx） */
  page?: string;
  /** 模板字段，key 对应模板里的占位符，value 一律 string */
  data: Record<string, { value: string }>;
}

interface WxSendResponse {
  errcode?: number;
  errmsg?: string;
}

/** 调微信"发送订阅消息"接口的薄封装 */
@Injectable()
export class WxNotifyService {
  private readonly logger = new Logger(WxNotifyService.name);

  constructor(private readonly tokenService: WxAccessTokenService) {}

  /**
   * @returns 是否成功送达微信（不代表用户一定能看到）
   *          失败仅 warn 日志，不抛错——业务流程不应被通知失败阻断
   */
  async send(input: WxSubscribeMessageInput): Promise<boolean> {
    if (!input.template_id) {
      this.logger.debug(`template_id 为空，跳过发送: ${JSON.stringify(input.data)}`);
      return false;
    }
    try {
      const token = await this.tokenService.getToken();
      const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`;
      const { data } = await axios.post<WxSendResponse>(
        url,
        {
          touser: input.touser,
          template_id: input.template_id,
          page: input.page,
          data: input.data,
          miniprogram_state: 'developer', // developer / trial / formal
          lang: 'zh_CN',
        },
        { timeout: 10_000 },
      );
      if (data.errcode !== 0) {
        this.logger.warn(
          `发送订阅消息失败 template=${input.template_id} errcode=${data.errcode} ${data.errmsg ?? ''}`,
        );
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(
        `发送订阅消息异常 template=${input.template_id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }
}
