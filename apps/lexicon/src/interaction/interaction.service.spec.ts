/**
 * interaction.service.spec.ts
 *
 * Unit tests for InteractionService – no `require` statements.
 * --------------------------------------------------------------
 * Run with:  npm run test   (or `npm run test:watch`)
 */

import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, WordForm } from 'src/bank/bank.entity';
import { Interaction, UserWordStatistics } from './interaction.entity';
import { InteractionService } from './interaction.service';
import * as masteryUtil from './mastery.util'; // <-- import the util module
import { WordScoringService } from 'src/lexicon/scoring.service';

/* ------------------------------------------------------------------
   Helper factories – lightweight objects for the mocks
   ------------------------------------------------------------------ */
const mockUser = (overrides?: Partial<User>) => ({
  id: 1,
  clientId: 'client-123',
  ...overrides,
});

const mockWord = (overrides?: Partial<any>) => ({
  id: 10,
  text: 'example',
  ...overrides,
});

const mockWordForm = (overrides?: Partial<WordForm>) => ({
  id: 100,
  word: mockWord(),
  ...overrides,
});

const mockInteraction = (overrides?: Partial<Interaction>) => ({
  id: 555,
  user: mockUser(),
  wordForm: mockWordForm(),
  type: 'chat_message',
  timestamp: new Date(),
  ...overrides,
});

const mockStats = (overrides?: Partial<UserWordStatistics>) => ({
  id: 777,
  user: mockUser(),
  word: mockWord(),
  weighted30Days: 0,
  totalInteractions30Days: 0,
  score: 0,
  lastUpdated: new Date(),
  ...overrides,
});

/* ------------------------------------------------------------------
   Minimal mock repository implementation
   ------------------------------------------------------------------ */
type MockRepo<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function createMockRepo<T>(): MockRepo<T> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

/* ------------------------------------------------------------------
   Test suite
   ------------------------------------------------------------------ */
describe('InteractionService', () => {
  let service: InteractionService;
  let interactionRepo: MockRepo<Interaction>;
  let userRepo: MockRepo<User>;
  let wordFormRepo: MockRepo<WordForm>;
  let statsRepo: MockRepo<UserWordStatistics>;
  let scoringService: jest.Mocked<WordScoringService>;

  /* --------------------------------------------------------------
     Module setup – inject mocked repositories
     -------------------------------------------------------------- */
  beforeEach(async () => {
    interactionRepo = createMockRepo<Interaction>();
    userRepo = createMockRepo<User>();
    wordFormRepo = createMockRepo<WordForm>();
    statsRepo = createMockRepo<UserWordStatistics>();

    scoringService = {
      scoreWord: jest.fn(),
      decayScore: jest.fn().mockImplementation((s) => s),
    } as unknown as jest.Mocked<WordScoringService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionService,
        Logger,
        {
          provide: getRepositoryToken(Interaction),
          useValue: interactionRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(WordForm),
          useValue: wordFormRepo,
        },
        {
          provide: getRepositoryToken(UserWordStatistics),
          useValue: statsRepo,
        },
        {
          provide: WordScoringService,
          useValue: scoringService,
        },
      ],
    }).compile();

    service = module.get<InteractionService>(InteractionService);
  });

  /* --------------------------------------------------------------
     getUserWordStatistics()
     -------------------------------------------------------------- */
  describe('getUserWordStatistics', () => {
    it('returns [] when the user cannot be found', async () => {
      userRepo.findOne!.mockResolvedValue(undefined);

      const result = await service.getUserWordStatistics('unknown-client');

      expect(result).toEqual([]);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { clientId: 'unknown-client' },
      });
    });

    it('fetches statistics for an existing user', async () => {
      const user = mockUser();
      const stats = [mockStats()];
      userRepo.findOne!.mockResolvedValue(user);
      statsRepo.find!.mockResolvedValue(stats);

      const result = await service.getUserWordStatistics(user.clientId);

      expect(result).toBe(stats);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { clientId: user.clientId },
      });
      expect(statsRepo.find).toHaveBeenCalledWith({
        where: { user: { id: user.id } },
        relations: ['word'],
      });
    });
  });

  /* --------------------------------------------------------------
     createInteraction()
     -------------------------------------------------------------- */
  describe('createInteraction', () => {
    const clientId = 'client-123';
    const wordFormId = 100;
    const type = 'chat_message';

    beforeEach(() => {
      // Common stubs used by the happy‑path tests
      userRepo.findOne!.mockResolvedValue(mockUser({ clientId }));
      wordFormRepo.findOne!.mockResolvedValue(mockWordForm({ id: wordFormId }));
      interactionRepo.create!.mockImplementation((dto) => ({
        ...dto,
        id: 999,
      }));
      interactionRepo.save!.mockResolvedValue(undefined);
    });

    it('throws when the user cannot be found', async () => {
      userRepo.findOne!.mockResolvedValue(undefined);
      await expect(
        service.createInteraction(clientId, wordFormId, type),
      ).rejects.toThrow(`User not found: ${clientId}`);
    });

    it('throws when the word form cannot be found', async () => {
      wordFormRepo.findOne!.mockResolvedValue(undefined);
      await expect(
        service.createInteraction(clientId, wordFormId, type),
      ).rejects.toThrow(`WordForm not found: ${wordFormId}`);
    });

    it('persists the interaction and triggers stats update', async () => {
      // Spy on the private method that updates statistics
      const updateSpy = jest
        .spyOn<any, any>(service as any, 'updateUserWordStatistics')
        .mockResolvedValue(undefined);

      const result = await service.createInteraction(
        clientId,
        wordFormId,
        type,
      );

      // Interaction creation expectations
      expect(interactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({ clientId }),
          wordForm: expect.objectContaining({ id: wordFormId }),
          type,
          timestamp: expect.any(Date),
        }),
      );
      expect(interactionRepo.save).toHaveBeenCalled();

      // Stats update should be called with the correct IDs
      expect(updateSpy).toHaveBeenCalledWith(
        expect.any(Number), // user.id
        expect.any(Number), // word.id
      );

      // Because we mocked the stats method to resolve undefined,
      // the service returns undefined as well.
      expect(result).toBeUndefined();
    });
  });

  /* --------------------------------------------------------------
     updateUserWordStatistics()
     -------------------------------------------------------------- */
  describe('updateUserWordStatistics', () => {
    const userId = 1;
    const wordId = 10;

    // Helper to build a fake query‑builder chain
    const fakeQB = () => {
      const qb: any = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      };
      return qb;
    };

    beforeEach(() => {
      // Mock interactions returned by the query builder
      const interactions = [
        mockInteraction({
          type: 'chat_message',
          timestamp: new Date(),
        }),
        mockInteraction({
          type: 'lexicon_import',
          timestamp: new Date(),
        }),
      ];
      const qb = fakeQB();
      qb.getMany.mockResolvedValue(interactions);
      interactionRepo.createQueryBuilder!.mockReturnValue(qb);
    });

    it('creates a new UserWordStatistics record when none exists', async () => {
      statsRepo.findOne!.mockResolvedValue(undefined);
      statsRepo.create!.mockImplementation((dto) => ({
        ...dto,
        id: 111,
      }));
      statsRepo.save!.mockResolvedValue(undefined);

      scoringService.scoreWord.mockReturnValue({
        score: 0.73,
        weighted30Days: 0.73,
      });

      // Force a deterministic mastery calculation
      jest.spyOn(masteryUtil, 'computeMastery').mockReturnValue(0.73);

      await (service as any).updateUserWordStatistics(userId, wordId);

      // Verify the query‑builder was used correctly
      const qb = interactionRepo.createQueryBuilder!.mock.results[0].value;
      expect(qb.innerJoin).toHaveBeenCalledWith('i.wordForm', 'wf');
      expect(qb.where).toHaveBeenCalledWith('i.userId = :userId', {
        userId,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('wf.wordId = :wordId', {
        wordId,
      });

      // New stats record should be created & saved
      expect(statsRepo.create).toHaveBeenCalledWith({
        user: { id: userId },
        word: { id: wordId },
      });
      expect(statsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          weighted30Days: expect.any(Number),
          totalInteractions30Days: 2,
          score: 0.73,
        }),
      );
    });

    it('updates an existing UserWordStatistics record', async () => {
      const existing = mockStats({ id: 222 });
      statsRepo.findOne!.mockResolvedValue(existing);
      statsRepo.save!.mockResolvedValue(undefined);

      scoringService.scoreWord.mockReturnValue({
      score: 0.42,
      weighted30Days: 0.42,
    });

      jest.spyOn(masteryUtil, 'computeMastery').mockReturnValue(0.42);

      await (service as any).updateUserWordStatistics(userId, wordId);

      expect(statsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: existing.id,
          weighted30Days: expect.any(Number),
          totalInteractions30Days: 2,
          score: 0.42,
        }),
      );
    });
  });
});
