import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { FamilyStatus } from '@family-kitchen/shared';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WsGateway } from '../ws/ws.gateway';

describe('UserService.deleteMe', () => {
  let service: UserService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    family: { update: jest.Mock };
    familyMember: { updateMany: jest.Mock; count: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      family: { update: jest.fn() },
      familyMember: {
        updateMany: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (cb: unknown) => {
        if (typeof cb === 'function') return (cb as (tx: unknown) => Promise<unknown>)(prisma);
        return Promise.all(cb as Promise<unknown>[]);
      }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: WsGateway, useValue: { sendToUser: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get<UserService>(UserService);
  });

  it('404 when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.deleteMe('u1')).rejects.toThrow(NotFoundException);
  });

  it('409 when already deleted', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      deletedAt: new Date(),
    });
    await expect(service.deleteMe('u1')).rejects.toThrow(ConflictException);
  });

  it('happy path with family: sets deletedAt, leaves family, dissolves family if empty', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      deletedAt: null,
      currentFamilyId: 'fam1',
    });
    prisma.familyMember.count.mockResolvedValue(0); // 家庭里没人了

    await service.deleteMe('u1');

    expect(prisma.familyMember.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', leftAt: null },
      data: { leftAt: expect.any(Date) },
    });
    expect(prisma.family.update).toHaveBeenCalledWith({
      where: { id: 'fam1' },
      data: expect.objectContaining({ status: FamilyStatus.DISSOLVING }),
    });
    const userUpdate = prisma.user.update.mock.calls[0][0];
    expect(userUpdate.where).toEqual({ id: 'u1' });
    expect(userUpdate.data.deletedAt).toBeInstanceOf(Date);
    expect(userUpdate.data.currentFamilyId).toBeNull();
  });

  it('happy path without family: only sets deletedAt', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      deletedAt: null,
      currentFamilyId: null,
    });

    await service.deleteMe('u1');

    expect(prisma.familyMember.updateMany).not.toHaveBeenCalled();
    expect(prisma.family.update).not.toHaveBeenCalled();
    const userUpdate = prisma.user.update.mock.calls[0][0];
    expect(userUpdate.data.deletedAt).toBeInstanceOf(Date);
  });

  it('happy path with family that still has other members: does NOT dissolve family', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      deletedAt: null,
      currentFamilyId: 'fam1',
    });
    prisma.familyMember.count.mockResolvedValue(1); // 还剩 1 个人

    await service.deleteMe('u1');

    expect(prisma.family.update).not.toHaveBeenCalled();
  });
});
