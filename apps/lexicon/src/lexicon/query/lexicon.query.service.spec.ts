import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, Word } from 'src/bank/bank.entity';
import { RedisProfileService } from '../profile.service';
import { LexiconQueryService } from './lexicon.query.service';
import { WordSnapshot } from './lexicon.query.types';

describe('LexiconQueryService', () => {
  let service: LexiconQueryService;

  let profile: jest.Mocked<RedisProfileService>;
  let wordRepo: jest.Mocked<Repository<Word>>;
  let userRepo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LexiconQueryService,
        {
          provide: RedisProfileService,
          useValue: {
            getUserTopWords: jest.fn(),
            getUserWordSeen: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Word),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            createQueryBuilder: jest.fn(() => ({
              insert: jest.fn().mockReturnThis(),
              into: jest.fn().mockReturnThis(),
              values: jest.fn().mockReturnThis(),
              orIgnore: jest.fn().mockReturnThis(),
              execute: jest.fn(),
            })),
            findOneOrFail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(LexiconQueryService);
    profile = module.get(RedisProfileService);
    wordRepo = module.get(getRepositoryToken(Word));
    userRepo = module.get(getRepositoryToken(User));
  });

  describe('getUserWordSnapshot', () => {
    it('should return empty array when no profile data exists', async () => {
      userRepo.findOneOrFail.mockResolvedValue({
        clientId: 'client-1',
      } as User);
      profile.getUserTopWords.mockResolvedValue([]);

      const result = await service.getUserWordSnapshot('client-1', 'en');

      expect(result).toEqual([]);
      expect(profile.getUserTopWords).toHaveBeenCalledWith(
        'client-1',
        'en',
        1000,
      );
    });

    it('should return ranked word snapshots with decay applied', async () => {
      userRepo.findOneOrFail.mockResolvedValue({
        clientId: 'client-1',
      } as User);

      profile.getUserTopWords.mockResolvedValue([
        { wordId: 1, score: 10 },
        { wordId: 2, score: 5 },
      ]);

      wordRepo.find.mockResolvedValue([
        {
          id: 1,
          word: 'run',
          lemma: 'run',
          pos: 'verb',
          language: 'en',
        } as Word,
        {
          id: 2,
          word: 'fast',
          lemma: 'fast',
          pos: 'adj',
          language: 'en',
        } as Word,
      ]);

      profile.getUserWordSeen.mockResolvedValue(
        new Map<number, number>([
          [1, Date.now() - 1 * 24 * 60 * 60 * 1000], // 1 day ago
          [2, Date.now() - 10 * 24 * 60 * 60 * 1000], // 10 days ago
        ]),
      );

      const result = await service.getUserWordSnapshot('client-1', 'en');

      expect(result.length).toBe(2);
      expect(result[0].stats.score).toBeGreaterThan(result[1].stats.score);

      expect(result).toEqual(
        expect.arrayContaining<WordSnapshot>([
          expect.objectContaining({
            word: 'run',
            stats: expect.objectContaining({
              rawScore: 10,
            }),
          }),
          expect.objectContaining({
            word: 'fast',
            stats: expect.objectContaining({
              rawScore: 5,
            }),
          }),
        ]),
      );
    });

    it('should skip words missing from the database', async () => {
      userRepo.findOneOrFail.mockResolvedValue({
        clientId: 'client-1',
      } as User);

      profile.getUserTopWords.mockResolvedValue([
        { wordId: 1, score: 10 },
        { wordId: 999, score: 50 }, // missing
      ]);

      wordRepo.find.mockResolvedValue([
        {
          id: 1,
          word: 'run',
          lemma: 'run',
          pos: 'verb',
          language: 'en',
        } as Word,
      ]);

      profile.getUserWordSeen.mockResolvedValue(
        new Map<number, number>([[1, Date.now()]]),
      );

      const result = await service.getUserWordSnapshot('client-1', 'en');

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
    });
  });
});
