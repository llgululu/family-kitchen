import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { WxAccessTokenService } from './wx-access-token.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function buildConfig(): ConfigService {
  return {
    get: (key: string) => {
      if (key === 'WX_APPID') return 'wx-app-id';
      if (key === 'WX_APP_SECRET') return 'wx-secret';
      return undefined;
    },
  } as unknown as ConfigService;
}

describe('WxAccessTokenService', () => {
  let service: WxAccessTokenService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [WxAccessTokenService, { provide: ConfigService, useValue: buildConfig() }],
    }).compile();
    service = moduleRef.get<WxAccessTokenService>(WxAccessTokenService);
  });

  it('fetches new token on first call', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { access_token: 'tk-1', expires_in: 7200 },
    });
    const token = await service.getToken();
    expect(token).toBe('tk-1');
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('reuses cached token within validity', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { access_token: 'tk-cached', expires_in: 7200 },
    });
    await service.getToken();
    const token = await service.getToken();
    expect(token).toBe('tk-cached');
    expect(mockedAxios.get).toHaveBeenCalledTimes(1); // 只调用一次
  });

  it('deduplicates concurrent requests', async () => {
    let resolveFn!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveFn = r;
    });
    mockedAxios.get.mockReturnValue(pending as never);

    const p1 = service.getToken();
    const p2 = service.getToken();
    resolveFn({ data: { access_token: 'tk-once', expires_in: 7200 } });

    await expect(p1).resolves.toBe('tk-once');
    await expect(p2).resolves.toBe('tk-once');
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('throws when WX returns errcode', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { errcode: 40013, errmsg: 'invalid appid' },
    });
    await expect(service.refresh()).rejects.toThrow('invalid appid');
  });

  it('throws when config missing', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        WxAccessTokenService,
        {
          provide: ConfigService,
          useValue: { get: () => undefined } as unknown as ConfigService,
        },
      ],
    }).compile();
    const svc = moduleRef.get<WxAccessTokenService>(WxAccessTokenService);
    await expect(svc.getToken()).rejects.toThrow('WX_APPID');
  });
});
