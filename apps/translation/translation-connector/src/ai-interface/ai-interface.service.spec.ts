import { Test, TestingModule } from '@nestjs/testing';
import { AiInterfaceService } from './ai-interface.service';

describe('AiInterfaceService', () => {
  let service: AiInterfaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiInterfaceService],
    }).compile();

    service = module.get<AiInterfaceService>(AiInterfaceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
