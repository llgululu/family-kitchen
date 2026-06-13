import { Test } from '@nestjs/testing';
import axios from 'axios';
import { WxNotifyService } from './wx-notify.service';
import { WxAccessTokenService } from './wx-access-token.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WxNotifyService', () => {
  let service: WxNotifyService;
  let token: { getToken: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    token = { getToken: jest.fn().mockResolvedValue('tk-test') };
    const moduleRef = await Test.createTestingModule({
      providers: [WxNotifyService, { provide: WxAccessTokenService, useValue: token }],
    }).compile();
    service = moduleRef.get<WxNotifyService>(WxNotifyService);
  });

  it('returns false silently when template_id is empty', async () => {
    const ok = await service.send({
      touser: 'openid-x',
      template_id: '',
      data: { thing1: { value: 'hi' } },
    });
    expect(ok).toBe(false);
    expect(token.getToken).not.toHaveBeenCalled();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('returns true on errcode=0', async () => {
    mockedAxios.post.mockResolvedValue({ data: { errcode: 0 } });
    const ok = await service.send({
      touser: 'openid-x',
      template_id: 'tmpl-abc',
      data: { thing1: { value: 'hi' } },
    });
    expect(ok).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalled();
  });

  it('returns false on errcode != 0 without throwing', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { errcode: 43101, errmsg: 'user refused' },
    });
    const ok = await service.send({
      touser: 'openid-x',
      template_id: 'tmpl-abc',
      data: { thing1: { value: 'hi' } },
    });
    expect(ok).toBe(false);
  });

  it('returns false on network error without throwing', async () => {
    mockedAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));
    const ok = await service.send({
      touser: 'openid-x',
      template_id: 'tmpl-abc',
      data: { thing1: { value: 'hi' } },
    });
    expect(ok).toBe(false);
  });
});
