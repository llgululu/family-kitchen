import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: { $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]) },
        },
      ],
    }).compile();
    controller = module.get<HealthController>(HealthController);
  });

  it('ping() returns ok', () => {
    const result = controller.ping();
    expect(result.status).toBe('ok');
    expect(typeof result.timestamp).toBe('string');
  });

  it('db() returns ok when db reachable', async () => {
    const result = await controller.db();
    expect(result.status).toBe('ok');
    expect(typeof result.latencyMs).toBe('number');
  });
});
