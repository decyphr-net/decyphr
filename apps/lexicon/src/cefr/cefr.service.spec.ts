import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/bank/bank.entity';
import { UserWordStatistics } from 'src/interaction/interaction.entity';
import { Repository } from 'typeorm';
import { CefrAssessmentService } from './cefr.service';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('CefrAssessmentService', () => {
  let service: CefrAssessmentService;
  let userRepo: MockRepository<User>;
  let statsRepo: MockRepository<UserWordStatistics>;

  beforeEach(async () => {
    userRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      }),
      findOneOrFail: jest
        .fn()
        .mockResolvedValue({ id: 1, clientId: 'client-1' }),
    };

    statsRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CefrAssessmentService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(UserWordStatistics),
          useValue: statsRepo,
        },
      ],
    }).compile();

    service = module.get<CefrAssessmentService>(CefrAssessmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assess', () => {
    it('should return CEFR A1 with empty stats', async () => {
      const result = await service.assess('client-1', 'en');

      expect(result.cefr).toBe('A1');
      expect(result.coverage).toBeDefined();
      expect(result.signals).toContain('Verb morphology still developing');
    });

    it('should calculate coverage correctly for mastered words', async () => {
      // Mock getMany to return stats for different POS and CEFR levels
      (statsRepo.createQueryBuilder as jest.Mock).mockReturnValueOnce({
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { score: 0.8, word: { pos: 'VERB', cefr: 'A1' } },
          { score: 0.9, word: { pos: 'NOUN', cefr: 'A1' } },
          { score: 0.6, word: { pos: 'PRON', cefr: 'A2' } },
        ]),
      });

      const result = await service.assess('client-1', 'en');

      expect(result.cefr).toBe('A1'); // only A1 exceeds threshold
      expect(result.coverage['A1'].coverage).toBeGreaterThan(0);
      expect(result.coverage['A2'].coverage).toBeGreaterThanOrEqual(0);
      expect(result.signals).toContain('Reliable verb usage');
    });
  });

  describe('posWeight', () => {
    it('should return correct weights for known POS', () => {
      const method = (service as any).posWeight.bind(service);

      expect(method('VERB')).toBe(1.3);
      expect(method('AUX')).toBe(1.2);
      expect(method('UNKNOWN')).toBe(1.0);
      expect(method(undefined)).toBe(1.0);
    });
  });

  describe('explainSignals', () => {
    it('should return appropriate signals based on mastery', () => {
      const stats: UserWordStatistics[] = [
        { score: 0.8, word: { pos: 'VERB', cefr: 'A1' } },
        { score: 0.8, word: { pos: 'PRON', cefr: 'A1' } },
        { score: 0.8, word: { pos: 'PART', cefr: 'A1' } },
      ] as any;

      const method = (service as any).explainSignals.bind(service);
      const signals = method(stats);

      expect(signals).toContain('Reliable verb usage');
      expect(signals).toContain('Strong function-word control');
    });
  });
});
