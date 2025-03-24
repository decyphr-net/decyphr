import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, Word } from 'src/bank/bank.entity';
import { Repository } from 'typeorm';
import { Interaction, UserWordStatistics } from './interaction.entity';
import { InteractionGateway } from './interaction.gateway';
import { InteractionService } from './interaction.service';

describe('InteractionService', () => {
  let service: InteractionService;
  let mockInteractionRepository: jest.Mocked<Repository<Interaction>>;
  let mockUserRepository: jest.Mocked<Repository<User>>;
  let mockWordRepository: jest.Mocked<Repository<Word>>;
  let mockUserWordStatsRepository: jest.Mocked<Repository<UserWordStatistics>>;
  let mockInteractionGateway: jest.Mocked<InteractionGateway>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionService,
        {
          provide: getRepositoryToken(Interaction),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
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
          },
        },
        {
          provide: getRepositoryToken(UserWordStatistics),
          useValue: {},
        },
        {
          provide: InteractionGateway,
          useValue: {
            sendWordStatistics: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InteractionService>(InteractionService);
    mockInteractionRepository = module.get(getRepositoryToken(Interaction));
    mockUserRepository = module.get(getRepositoryToken(User));
    mockWordRepository = module.get(getRepositoryToken(Word));
    mockUserWordStatsRepository = module.get(
      getRepositoryToken(UserWordStatistics),
    );
    mockInteractionGateway = module.get(InteractionGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should save an interaction', async () => {
    const mockUser = { id: 1 } as User;
    const mockWord = { id: 1 } as Word;
    const mockInteraction = {
      user: mockUser,
      word: mockWord,
      type: 'active',
    } as Interaction;

    // Mock repository calls
    mockUserRepository.findOne.mockResolvedValue(mockUser);
    mockWordRepository.findOne.mockResolvedValue(mockWord);
    mockInteractionRepository.create.mockReturnValue(mockInteraction);
    mockInteractionRepository.save.mockResolvedValue(mockInteraction);

    const result = await service.createInteraction('client-id', 1, 'active');

    expect(result).toEqual(mockInteraction);
    expect(mockInteractionRepository.save).toHaveBeenCalledWith(
      mockInteraction,
    );
  });
});
