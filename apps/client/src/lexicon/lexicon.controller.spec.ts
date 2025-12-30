import { Test, TestingModule } from '@nestjs/testing';
import { LexiconController } from './lexicon.controller';

describe('LexiconController', () => {
  let controller: LexiconController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LexiconController],
    }).compile();

    controller = module.get<LexiconController>(LexiconController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
