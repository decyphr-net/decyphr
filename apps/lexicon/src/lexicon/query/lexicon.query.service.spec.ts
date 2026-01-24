import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, Word } from 'src/bank/bank.entity';
import { RedisProfileService } from '../profile.service';
import { LexiconQueryService } from './lexicon.query.service';
import { WordSnapshot } from './lexicon.query.types';
import { WordScoringService } from '../scoring.service';
import { UserWordStatistics } from 'src/interaction/interaction.entity';

describe('LexiconQueryService', () => {
  let service: LexiconQueryService;

  let profile: jest.Mocked<RedisProfileService>;
  let wordRepo: jest.Mocked<Repository<Word>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let statsRepo: jest.Mocked<Repository<UserWordStatistics>>;

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
        {
          provide: WordScoringService,
          useValue: { scoreWord: jest.fn() },
        },
        {
          provide: getRepositoryToken(UserWordStatistics),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: WordScoringService,
          useValue: {
            scoreWord: jest.fn(),
            decayScore: jest.fn()
              .mockImplementation((score: number, _days: number) => {
                return score;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(LexiconQueryService);
    profile = module.get(RedisProfileService);
    wordRepo = module.get(getRepositoryToken(Word));
    userRepo = module.get(getRepositoryToken(User));
    statsRepo = module.get(getRepositoryToken(UserWordStatistics));

    statsRepo.find.mockResolvedValue([]);
  });

  describe('getUserWordSnapshot', () => {
    it('should return empty array when no profile data exists', async () => {
      userRepo.findOneOrFail.mockResolvedValue({
        id: 123,
        clientId: 'client-1',
      } as User);

      statsRepo.find.mockResolvedValue([]);

      const result = await service.getUserWordSnapshot('client-1', 'en');

      expect(result).toEqual([]);
      expect(statsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            user: { id: 123 },
            word: { language: 'en' },
          },
          relations: ['word'],
        }),
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

      statsRepo.find.mockResolvedValue([
        {
          id: 1,
          word: { id: 1 } as any,
          score: 10,
          lastUpdated: new Date(),
        } as any,
        {
          id: 2,
          word: { id: 2 } as any,
          score: 5,
          lastUpdated: new Date(),
        } as any,
      ]);

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
      // -----------------------------------------------------------------
      // 1️⃣ USER
      // -----------------------------------------------------------------
      userRepo.findOneOrFail.mockResolvedValue({
        clientId: 'client-1',
      } as User);

      // -----------------------------------------------------------------
      // 2️⃣ PROFILE – top‑words list (includes a missing word)
      // -----------------------------------------------------------------
      profile.getUserTopWords.mockResolvedValue([
        { wordId: 1, score: 10 },
        { wordId: 999, score: 50 },
      ]);

      // -----------------------------------------------------------------
      // 3️⃣ WORD REPO – only the existing word is returned
      // -----------------------------------------------------------------
      wordRepo.find.mockResolvedValue([
        {
          id: 1,
          word: 'run',
          lemma: 'run',
          pos: 'verb',
          language: 'en',
        } as Word,
      ]);

      // -----------------------------------------------------------------
      // 4️⃣ PROFILE – when the service asks for “last seen” timestamps
      // -----------------------------------------------------------------
      profile.getUserWordSeen.mockResolvedValue(
        new Map<number, number>([[1, Date.now()]]),
      );

      statsRepo.find.mockResolvedValue([
        {
          // The service expects `stat.word.id`
          word: { id: 1 } as any,
          score: 10,
          lastUpdated: new Date(),
        } as any,
      ]);

      // -----------------------------------------------------------------
      // 5️⃣ STATISTICS REPO mock
      // -----------------------------------------------------------------
      // The service expects each stat to have a `word` object with an `id`
      // and a `lastUpdated` timestamp (used for deduplication).
      statsRepo.find.mockResolvedValue([
        {
          id: 1,
          word: { id: 1 } as any,
          score: 10,
          lastUpdated: new Date(),
        } as any,
      ]);

      // -----------------------------------------------------------------
      // 6️⃣ ACT
      // -----------------------------------------------------------------
      const result = await service.getUserWordSnapshot('client-1', 'en');

      // -----------------------------------------------------------------
      // 7️⃣ ASSERT
      // -----------------------------------------------------------------
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
    });
  });
});
