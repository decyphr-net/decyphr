import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BankService } from 'src/bank/bank.service';
import { Repository } from 'typeorm';
import { Statement } from './statement.entity';
import { StatementService } from './statement.service';

// Mocking external services
jest.mock('src/bank/bank.service');

describe('StatementService', () => {
  let statementService: StatementService;
  let mockStatementRepository: jest.Mocked<Repository<Statement>>;
  let mockBankService: Partial<BankService>;

  beforeEach(async () => {
    mockStatementRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Statement>>;

    mockBankService = {
      saveBreakdownForUser: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatementService,
        {
          provide: getRepositoryToken(Statement),
          useValue: mockStatementRepository,
        },
        {
          provide: BankService, // ✅ Mock BankService
          useValue: mockBankService,
        },
      ],
    }).compile();

    statementService = module.get<StatementService>(StatementService);
  });

  it('should be defined', () => {
    expect(statementService).toBeDefined();
  });

  it('should store a statement and breakdown information', async () => {
    const mockStatementData = {
      statement: 'Hello, world!',
      language: 'es',
      timestamp: new Date().toISOString(),
      source: 'user_input',
      clientId: 'client123',
      interactionType: 'active',
      translationResponse: {
        detectedLanguage: 'en',
        translatedText: 'Hola, mundo!',
        tense: 'present',
        breakdown: [
          {
            id: '1',
            originalWord: 'Hello',
            translatedWord: 'Hola',
            lemma: 'hello',
            level: 'A1',
            pos_tag: 'interjection',
            alternatives: ['Hi', 'Hey'],
          },
        ],
      },
    };

    const mockStatementEntity = {
      id: 1,
      ...mockStatementData,
      timestamp: new Date(),
    };

    mockStatementRepository.create.mockReturnValue(mockStatementEntity);
    mockStatementRepository.save.mockResolvedValue(mockStatementEntity);

    await statementService.storeStatement(mockStatementData);

    expect(mockStatementRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        ...mockStatementData,
        timestamp: expect.any(Date),
      }),
    );
  });
});
