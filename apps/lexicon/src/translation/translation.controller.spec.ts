import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';

describe('TranslationController', () => {
  let controller: TranslationController;
  let translationService: TranslationService;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TranslationController],
      providers: [
        {
          provide: TranslationService,
          useValue: {
            handleTranslation: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TranslationController>(TranslationController);
    translationService = module.get<TranslationService>(TranslationService);

    // Properly mock Logger
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should log the payload and handle the translation', async () => {
    const payload = {
      statement: 'Hello, world!',
      language: 'es',
      timestamp: '1616161616161',
      source: 'manual',
      clientId: 'client123',
      interactionType: 'active',
      translationResponse: {
        translated: 'Hola, mundo!',
        tense: 'present',
        breakdown: [
          {
            id: '1',
            originalWord: 'hello',
            translatedWord: 'hola',
            lemma: 'hello',
            level: 'A1',
            pos_tag: 'verb',
          },
        ],
      },
    };

    await controller.handleEvent(payload);

    expect(logSpy).toHaveBeenCalledWith(
      'Received translation response',
      expect.stringContaining('"statement":"Hello, world!"'),
    );
    expect(translationService.handleTranslation).toHaveBeenCalledWith(payload);
  });

  it('should log an error if translation processing fails', async () => {
    const payload = {
      statement: 'Hello, world!',
      language: 'es',
      timestamp: '1616161616161',
      source: 'manual',
      clientId: 'client123',
      interactionType: 'active',
      translationResponse: {
        translated: 'Hola, mundo!',
        tense: 'present',
        breakdown: [
          {
            id: '1',
            originalWord: 'hello',
            translatedWord: 'hola',
            lemma: 'hello',
            level: 'A1',
            pos_tag: 'verb',
          },
        ],
      },
    };

    jest
      .spyOn(translationService, 'handleTranslation')
      .mockRejectedValue(new Error('Translation failed'));

    await expect(controller.handleEvent(payload)).rejects.toThrow(
      'Translation failed',
    );

    expect(errorSpy).toHaveBeenCalledWith(
      'Error processing translation',
      expect.any(String), // ✅ Matches any error message string
    );
  });
});
