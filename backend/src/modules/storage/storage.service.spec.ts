import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService, MAX_UPLOAD_SIZE_BYTES } from './storage.service';
import { StorageCategory } from './dto/upload-result.dto';

// mock minio client：只验证调用，不真连
jest.mock('minio', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      bucketExists: jest.fn().mockResolvedValue(true),
      makeBucket: jest.fn(),
      setBucketPolicy: jest.fn(),
      putObject: jest.fn().mockResolvedValue(undefined),
      removeObject: jest.fn().mockResolvedValue(undefined),
      presignedGetObject: jest.fn().mockResolvedValue('signed://x'),
    })),
  };
});

function buildConfig(overrides: Record<string, string> = {}): ConfigService {
  const map: Record<string, string> = {
    MINIO_ENDPOINT: 'localhost',
    MINIO_PORT: '9000',
    MINIO_USE_SSL: 'false',
    MINIO_ACCESS_KEY: 'minioadmin',
    MINIO_SECRET_KEY: 'minioadmin',
    MINIO_BUCKET: 'family-kitchen',
    MINIO_PUBLIC_BASE_URL: 'http://localhost:9000/family-kitchen',
    ...overrides,
  };
  return {
    get: <T>(key: string, fallback?: T) => (map[key] as unknown as T) ?? fallback,
  } as unknown as ConfigService;
}

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [StorageService, { provide: ConfigService, useValue: buildConfig() }],
    }).compile();
    service = moduleRef.get<StorageService>(StorageService);
  });

  describe('uploadFile', () => {
    it('rejects non-image mime types', async () => {
      await expect(
        service.uploadFile({
          buffer: Buffer.from([0]),
          mimeType: 'application/pdf',
          category: StorageCategory.RECIPE,
          userId: 'u1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects files over 10MB', async () => {
      const tooBig = Buffer.alloc(MAX_UPLOAD_SIZE_BYTES + 1);
      await expect(
        service.uploadFile({
          buffer: tooBig,
          mimeType: 'image/jpeg',
          category: StorageCategory.RECIPE,
          userId: 'u1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('generates key with category prefix + date + user-random.ext', async () => {
      const result = await service.uploadFile({
        buffer: Buffer.from('fake'),
        mimeType: 'image/jpeg',
        category: StorageCategory.RECIPE,
        userId: 'u-abc',
      });
      expect(result.key).toMatch(/^recipe\/\d{4}-\d{2}-\d{2}\/u-abc-[a-zA-Z0-9]{16}\.jpg$/);
      expect(result.url).toBe(`http://localhost:9000/family-kitchen/${result.key}`);
      expect(result.size).toBe(4);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it.each([
      ['image/png', 'png'],
      ['image/webp', 'webp'],
      ['image/gif', 'gif'],
    ])('maps %s to .%s', async (mime, expectedExt) => {
      const result = await service.uploadFile({
        buffer: Buffer.from('x'),
        mimeType: mime,
        category: StorageCategory.AVATAR,
        userId: 'u1',
      });
      expect(result.key.endsWith(`.${expectedExt}`)).toBe(true);
    });
  });

  describe('publicUrl', () => {
    it('strips trailing slash from base and joins key', () => {
      expect(service.publicUrl('a/b.jpg')).toBe('http://localhost:9000/family-kitchen/a/b.jpg');
    });
  });
});
