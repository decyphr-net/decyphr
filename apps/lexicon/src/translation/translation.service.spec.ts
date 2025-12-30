import { Test, TestingModule } from '@nestjs/testing';
import { StatementService } from 'src/statement/statement.service';
import {
  TextTranslatedPayloadDto,
  TranslationResponseDto,
} from './dto/payload.dto';
import { TranslationService } from './translation.service';

// Mocking StatementService
jest.mock('src/statement/statement.service');

describe('TranslationService', () => {
  let translationService: TranslationService;
  let statementService: StatementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TranslationService, StatementService],
    }).compile();

    translationService = module.get<TranslationService>(TranslationService);
    statementService = module.get<StatementService>(StatementService);
  });

  describe('handleTranslation', () => {
    it('should store the translation statement', async () => {
      const breakdown: BreakdownDto[] = [
        {
          id: '1',
          originalWord: 'hello',
          translatedWord: 'hola',
          lemma: 'hello',
          level: 'A1',
          pos_tag: 'verb'
        },
      ];

      const translationResponse: TranslationResponseDto = {
        translated: 'Hola, mundo!',
        tense: 'present',
        breakdown: breakdown,
      };

      const payload: TextTranslatedPayloadDto = {
        statement: 'Hello, world!',
        language: 'es',
        timestamp: '1616161616161',
        source: 'manual',
        clientId: 'client123',
        interactionType: 'active',
        translationResponse: translationResponse,
      };

      // Mocking the storeStatement method to resolve without any issue
      statementService.storeStatement = jest.fn().mockResolvedValue(undefined);

      await translationService.handleTranslation(payload);

      // Check that storeStatement was called with the correct payload
      expect(statementService.storeStatement).toHaveBeenCalledWith(payload);
    });

    it('should throw an error if statement storage fails', async () => {
      const breakdown: BreakdownDto[] = [
        {
          id: '1',
          originalWord: 'hello',
          translatedWord: 'hola',
          lemma: 'hello',
          level: 'A1',
          pos_tag: 'verb',
        },
      ];

      const translationResponse: TranslationResponseDto = {
        translated: 'Hola, mundo!',
        tense: 'present',
      };

      const payload: TextTranslatedPayloadDto = {
        statement: 'Hello, world!',
        language: 'es',
        timestamp: '1616161616161',
        source: 'manual',
        clientId: 'client123',
        interactionType: 'active',
        translationResponse: translationResponse,
      };

      // Mocking the storeStatement method to throw an error
      statementService.storeStatement = jest
        .fn()
        .mockRejectedValue(new Error('Storage failed'));

      try {
        await translationService.handleTranslation(payload);
      } catch (error) {
        // Check that the error was thrown when statement storage failed
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Storage failed');
      }
    });
  });
});
