import { Test, TestingModule } from '@nestjs/testing';
import { TranslationsController } from './translations.controller';

describe('TranslationsController', () => {
  let controller: TranslationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TranslationsController],
    }).compile();

    controller = module.get<TranslationsController>(TranslationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
