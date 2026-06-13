import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WsGateway } from '../ws/ws.gateway';
import * as passwordUtil from '../auth/password.util';

jest.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('hashed');

describe('UserService.bindCredentials', () => {
  let service: UserService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
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

  it('binds successfully when phone is not taken', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({
      id: 'u1',
      nickname: 'A',
      avatarUrl: null,
      gender: null,
      signature: null,
      currentFamilyId: null,
      phone: '13800001111',
      passwordHash: 'hashed',
      createdAt: new Date(),
    });

    const result = await service.bindCredentials('u1', {
      phone: '13800001111',
      password: '123456',
    });

    expect(result.phone).toBe('13800001111');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: { phone: '13800001111', passwordHash: 'hashed' },
      }),
    );
  });

  it('allows updating password when phone belongs to the same user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', deletedAt: null, currentFamilyId: null });
    prisma.user.update.mockResolvedValue({
      id: 'u1',
      nickname: 'A',
      avatarUrl: null,
      gender: null,
      signature: null,
      currentFamilyId: null,
      phone: '13800001111',
      passwordHash: 'hashed',
      createdAt: new Date(),
    });

    const result = await service.bindCredentials('u1', {
      phone: '13800001111',
      password: 'newpass',
    });

    expect(result.phone).toBe('13800001111');
  });

  it('throws PHONE_BOUND_TO_FAMILY when owner has a family', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u2',
      deletedAt: null,
      currentFamilyId: 'fam1',
    });

    await expect(
      service.bindCredentials('u1', { phone: '13800001111', password: '123456' }),
    ).rejects.toThrow(ConflictException);

    try {
      await service.bindCredentials('u1', { phone: '13800001111', password: '123456' });
    } catch (err) {
      expect((err as ConflictException).getResponse()).toEqual(
        expect.objectContaining({ code: 'PHONE_BOUND_TO_FAMILY' }),
      );
    }
  });

  it('throws PHONE_REGISTERED_NO_FAMILY when owner has no family', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u2',
      deletedAt: null,
      currentFamilyId: null,
    });

    await expect(
      service.bindCredentials('u1', { phone: '13800001111', password: '123456' }),
    ).rejects.toThrow(ConflictException);

    try {
      await service.bindCredentials('u1', { phone: '13800001111', password: '123456' });
    } catch (err) {
      expect((err as ConflictException).getResponse()).toEqual(
        expect.objectContaining({ code: 'PHONE_REGISTERED_NO_FAMILY' }),
      );
    }
  });

  it('clears deleted account phone and binds successfully', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u2',
      deletedAt: new Date(),
      currentFamilyId: null,
    });
    prisma.user.update.mockResolvedValue({
      id: 'u1',
      nickname: 'A',
      avatarUrl: null,
      gender: null,
      signature: null,
      currentFamilyId: null,
      phone: '13800001111',
      passwordHash: 'hashed',
      createdAt: new Date(),
    });

    const result = await service.bindCredentials('u1', {
      phone: '13800001111',
      password: '123456',
    });

    // First update clears the deleted user's phone
    expect(prisma.user.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'u2' },
      data: { phone: null },
    });
    // Second update binds to the requesting user
    expect(prisma.user.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 'u1' },
        data: { phone: '13800001111', passwordHash: 'hashed' },
      }),
    );
    expect(result.phone).toBe('13800001111');
  });
});
