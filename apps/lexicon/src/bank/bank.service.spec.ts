import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
});
