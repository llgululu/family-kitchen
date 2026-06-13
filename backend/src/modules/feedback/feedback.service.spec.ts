import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackStatus } from './dto/feedback.dto';
import { PrismaService } from '../../prisma/prisma.service';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let prisma: {
    feedback: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      feedback: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [FeedbackService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get<FeedbackService>(FeedbackService);
  });

  it('creates feedback with userId attached', async () => {
    prisma.feedback.create.mockImplementation((args) =>
      Promise.resolve({
        id: 'fb1',
        userId: args.data.userId,
        content: args.data.content,
        contact: args.data.contact,
        status: 'pending',
        appVersion: null,
        platform: args.data.platform,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    const result = await service.create('u1', {
      content: '希望增加 X 功能',
      platform: 'mp-weixin',
    });
    expect(result.userId).toBe('u1');
    expect(result.status).toBe('pending');
  });

  it('updateStatus 404 when not found', async () => {
    prisma.feedback.findUnique.mockResolvedValue(null);
    await expect(service.updateStatus('fb1', { status: FeedbackStatus.PROCESSED })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updateStatus updates and returns new status', async () => {
    prisma.feedback.findUnique.mockResolvedValue({ id: 'fb1' });
    prisma.feedback.update.mockResolvedValue({
      id: 'fb1',
      userId: 'u1',
      content: 'x',
      contact: null,
      status: 'processed',
      appVersion: null,
      platform: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await service.updateStatus('fb1', {
      status: FeedbackStatus.PROCESSED,
    });
    expect(result.status).toBe('processed');
  });
});
