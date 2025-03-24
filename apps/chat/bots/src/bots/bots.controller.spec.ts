import { Test, TestingModule } from '@nestjs/testing';
import { BotsController } from './bots.controller';
import { Bot } from './bots.entity';
import { BotsService } from './bots.service';

describe('BotsController', () => {
  let controller: BotsController;
  let service: BotsService;

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

  const mockBotsService = {
    findAll: jest.fn().mockResolvedValue([mockBot]),
    findOne: jest.fn().mockResolvedValue(mockBot),
    findByLanguage: jest.fn().mockResolvedValue([mockBot]),
    create: jest.fn().mockResolvedValue(mockBot),
    update: jest.fn().mockResolvedValue(mockBot),
    remove: jest
      .fn()
      .mockResolvedValue({ message: 'Bot successfully deleted' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BotsController],
      providers: [
        {
          provide: BotsService,
          useValue: mockBotsService,
        },
      ],
    }).compile();

    controller = module.get<BotsController>(BotsController);
    service = module.get<BotsService>(BotsService);
  });

  describe('getAllBots', () => {
    it('should return all bots when no language filter is applied', async () => {
      expect(await controller.getAllBots()).toEqual([mockBot]);
    });

    it('should return bots filtered by language', async () => {
      const filteredBots = [mockBot];

      jest.spyOn(service, 'findByLanguage').mockResolvedValue(filteredBots);

      expect(await controller.getAllBots('en-IE')).toEqual(filteredBots);
    });
  });
});
