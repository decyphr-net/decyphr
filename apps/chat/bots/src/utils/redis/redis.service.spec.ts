import { Test, TestingModule } from '@nestjs/testing';
import * as Redis from 'ioredis';
import { RedisService } from './redis.service';

jest.mock('ioredis');

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    (Redis as any).mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize Redis client and set event listeners', async () => {
      const onSpy = jest.fn();
      (Redis as any).mockImplementation(() => ({
        on: onSpy,
      }));

      await service.onModuleInit();

      expect(onSpy).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('onModuleDestroy', () => {
    it('should close the Redis client gracefully', async () => {
      const quit = jest.fn().mockResolvedValue(undefined);
      service.client = { quit } as any;

      await expect(service.onModuleDestroy()).resolves.not.toThrow();
      expect(quit).toHaveBeenCalled();
    });
  });
});
