import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BreakdownDto } from 'src/translation/dto/payload.dto';
import { Repository } from 'typeorm';
import { Interaction } from '../interaction/interaction.entity';
import { User, Word } from './bank.entity';
import { BankService } from './bank.service';

describe('BankService', () => {
  let bankService: BankService;
  let mockUserRepository: jest.Mocked<Repository<User>>;
  let mockWordRepository: jest.Mocked<Repository<Word>>;
  let mockInteractionRepository: jest.Mocked<Repository<Interaction>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Word),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Interaction),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(), // ✅ Added missing `create()`
            save: jest.fn(), // ✅ Added `save()`
          },
        },
      ],
    }).compile();

    bankService = module.get<BankService>(BankService);
    mockUserRepository = module.get(getRepositoryToken(User));
    mockWordRepository = module.get(getRepositoryToken(Word));
    mockInteractionRepository = module.get(getRepositoryToken(Interaction));
  });

  it('should be defined', () => {
    expect(bankService).toBeDefined();
  });

  it('should save a breakdown for a user', async () => {
    const breakdown: BreakdownDto[] = [
      {
        id: '1',
        originalWord: 'Hola',
        translatedWord: 'Hello',
        lemma: 'hola',
        level: 'A1',
        pos_tag: 'noun',
        alternatives: ['saludo'],
      },
    ];

    const mockUser = { id: 1 } as User;
    const mockWord = { id: 1 } as Word;
    const mockInteraction = {
      id: 1,
      user: mockUser,
      word: mockWord,
      type: 'active',
      timestamp: new Date(),
    } as Interaction;

    mockUserRepository.findOne.mockResolvedValue(mockUser);
    mockWordRepository.findOne.mockResolvedValue(mockWord);
    mockInteractionRepository.create.mockReturnValue(mockInteraction);
    mockInteractionRepository.save.mockResolvedValue(mockInteraction);

    await expect(
      bankService.saveBreakdownForUser(breakdown, 'client1', 'es', 'active'),
    ).resolves.not.toThrow();

    expect(mockInteractionRepository.create).toHaveBeenCalledWith({
      user: mockUser,
      word: mockWord,
      type: 'active',
      timestamp: expect.any(Date),
    });

    expect(mockInteractionRepository.save).toHaveBeenCalledWith(
      mockInteraction,
    );
  });
});
