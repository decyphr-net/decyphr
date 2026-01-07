import { Test, TestingModule } from '@nestjs/testing';
import Redis from 'ioredis';
import { REDIS } from 'src/common/redis.provider';
import { RedisProfileService } from './profile.service';

describe('RedisProfileService', () => {
  let service: RedisProfileService;
  let redis: jest.Mocked<Redis>;

  beforeEach(async () => {
    const redisMock: Partial<jest.Mocked<Redis>> = {
      hset: jest.fn(),
      zincrby: jest.fn(),
      zrevrange: jest.fn(),
      hmget: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisProfileService,
        {
          provide: REDIS,
          useValue: redisMock,
        },
      ],
    }).compile();

    service = module.get(RedisProfileService);
    redis = module.get(REDIS);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------- Words ----------------

  describe('setWord', () => {
    it('stores a word in Redis', async () => {
      await service.setWord(1, 'hello');

      expect(redis.hset).toHaveBeenCalledWith('lexicon:words', '1', 'hello');
    });

    it('does not write if wordId is invalid', async () => {
      await service.setWord(-1, 'hello');

      expect(redis.hset).not.toHaveBeenCalled();
    });

    it('does not write if word is empty', async () => {
      await service.setWord(1, '');

      expect(redis.hset).not.toHaveBeenCalled();
    });
  });

  // ---------------- Scores ----------------

  describe('addOrUpdateUserWordScore', () => {
    it('increments score for user word', async () => {
      await service.addOrUpdateUserWordScore('user1', 'en', 42, 1.5);

      expect(redis.zincrby).toHaveBeenCalledWith(
        'user:user1:priority:en',
        1.5,
        '42',
      );
    });

    it('does not write if inputs are missing', async () => {
      await service.addOrUpdateUserWordScore('', 'en', 42, 1);

      expect(redis.zincrby).not.toHaveBeenCalled();
    });

    it('does not write if scoreDelta is invalid', async () => {
      await service.addOrUpdateUserWordScore('user1', 'en', 42, Number.NaN);

      expect(redis.zincrby).not.toHaveBeenCalled();
    });
  });

  describe('getUserTopWords', () => {
    it('returns parsed wordId/score pairs', async () => {
      redis.zrevrange.mockResolvedValue(['10', '2.5', '20', '1.0']);

      const result = await service.getUserTopWords('user1', 'en', 10);

      expect(redis.zrevrange).toHaveBeenCalledWith(
        'user:user1:priority:en',
        0,
        9,
        'WITHSCORES',
      );

      expect(result).toEqual([
        { wordId: 10, score: 2.5 },
        { wordId: 20, score: 1.0 },
      ]);
    });

    it('returns empty array if no results', async () => {
      redis.zrevrange.mockResolvedValue([]);

      const result = await service.getUserTopWords('user1', 'en');

      expect(result).toEqual([]);
    });
  });

  // ---------------- Seen timestamps ----------------

  describe('markWordSeen', () => {
    it('stores seen timestamp', async () => {
      await service.markWordSeen('user1', 'en', 5);

      expect(redis.hset).toHaveBeenCalledWith(
        'user:user1:seen:en',
        '5',
        expect.any(String),
      );
    });

    it('does not write on invalid input', async () => {
      await service.markWordSeen('', 'en', 5);

      expect(redis.hset).not.toHaveBeenCalled();
    });
  });

  describe('getUserWordSeen', () => {
    it('returns a map of seen timestamps', async () => {
      redis.hmget.mockResolvedValue(['1700000000000', null, '1700000001000']);

      const result = await service.getUserWordSeen('user1', 'en', [1, 2, 3]);

      expect(redis.hmget).toHaveBeenCalledWith(
        'user:user1:seen:en',
        '1',
        '2',
        '3',
      );

      expect(result.get(1)).toBe(1700000000000);
      expect(result.has(2)).toBe(false);
      expect(result.get(3)).toBe(1700000001000);
    });

    it('returns empty map if wordIds is empty', async () => {
      const result = await service.getUserWordSeen('user1', 'en', []);

      expect(result.size).toBe(0);
      expect(redis.hmget).not.toHaveBeenCalled();
    });
  });
});
