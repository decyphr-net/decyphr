import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bot } from './bots.entity';
import { BotsService } from './bots.service';

describe('BotsService', () => {
  let service: BotsService;
  let botRepository: Repository<Bot>;

  const mockBot: Bot = {
    id: 1,
    name: 'Test Bot',
    gender: 'Male',
    age: 5,
    region: 'Europe',
    city: 'Dublin',
    background: 'AI Assistant',
    occupation: 'Helper',
    hobbies: 'Reading, Coding',
    personal: 'Friendly and helpful',
    language: 'en-IE',
  };

  const mockRepository = {
    find: jest.fn().mockResolvedValue([mockBot]),
    findOne: jest.fn().mockResolvedValue(mockBot),
    findByLanguage: jest.fn().mockResolvedValue([mockBot]),
    create: jest.fn().mockReturnValue(mockBot),
    save: jest.fn().mockResolvedValue(mockBot),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotsService,
        {
          provide: getRepositoryToken(Bot),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BotsService>(BotsService);
    botRepository = module.get<Repository<Bot>>(getRepositoryToken(Bot));
  });

  describe('findByLanguage', () => {
    it('should return bots filtered by language', async () => {
      const filteredBots = [mockBot];

      jest.spyOn(botRepository, 'find').mockResolvedValue(filteredBots);

      const result = await service.findByLanguage('en-IE');
      expect(result).toEqual(filteredBots);
    });
  });
});
