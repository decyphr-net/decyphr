import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getRepositoryToken } from '@nestjs/typeorm';
import { Connection, DataSource, Repository } from 'typeorm';

import { User, Word, WordForm } from 'src/bank/bank.entity';
import { InteractionService } from 'src/interaction/interaction.service';
import { StatementService } from 'src/statement/statement.service';
import { RedisProfileService } from '../profile.service';
import { LexiconIngestService } from './lexicon.ingest.service';
import { NlpCompleteEvent } from './lexicon.ingest.types';
import { WordScoringService } from '../scoring.service';
import { Logger } from '@nestjs/common';

type StatementProducer = any;

// ------------------------------------------------------------------
// Helper to create a simple jest‑mocked repository
function createMockRepo<T>() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  } as unknown as jest.Mocked<Repository<T>>;
}

describe('LexiconIngestService', () => {
  let service: LexiconIngestService;

  // ----- repository mocks -----
  let userRepo: jest.Mocked<Repository<User>>;
  let wordRepo: jest.Mocked<Repository<Word>>;
  let wordFormRepo: jest.Mocked<Repository<WordForm>>;

  // ----- other service mocks -----
  let profileService: jest.Mocked<RedisProfileService>;
  let interactionService: jest.Mocked<InteractionService>;
  let statementService: jest.Mocked<StatementService>;
  let wordScoringService: jest.Mocked<WordScoringService>;

  // ----- DataSource mock -----
  let dataSource: Partial<DataSource>;

  // ----- STATEMENT_PRODUCER mock -----
  let statementProducer: StatementProducer;

  beforeEach(async () => {
    // ---- create the mocks ----
    userRepo = createMockRepo<User>();
    wordRepo = createMockRepo<Word>();
    wordFormRepo = createMockRepo<WordForm>();

    wordFormRepo.createQueryBuilder = jest
      .fn()
      .mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      });

    profileService = {
      setWord: jest.fn(),
      addOrUpdateUserWordScore: jest.fn(),
      markWordSeen: jest.fn(),
    } as unknown as jest.Mocked<RedisProfileService>;

    interactionService = {
      createInteraction: jest.fn(),
    } as unknown as jest.Mocked<InteractionService>;

    statementService = {
      getOrCreate: jest.fn().mockImplementation(async (input) => ({
        id: 1,
        ...input,
      })),
      persistFromEvent: jest.fn(),
      createTokens: jest.fn().mockResolvedValue(undefined),
      clearTokens: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockImplementation(async (id: number, opts?: any) => ({
        id,
        tokens: [],
      })),
    } as unknown as jest.Mocked<StatementService>;

    wordScoringService = {
      scoreWord: jest.fn(),
    } as unknown as jest.Mocked<WordScoringService>;

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      }),
    };

    statementProducer = {
      send: jest.fn(),
      emit: jest.fn().mockResolvedValue(undefined),
    } as unknown as StatementProducer;

    // ---- build the testing module ----
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LexiconIngestService,
        Logger,

        // ----- repository providers -----
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Word), useValue: wordRepo },
        { provide: getRepositoryToken(WordForm), useValue: wordFormRepo },

        // ----- other service providers -----
        { provide: RedisProfileService, useValue: profileService },
        { provide: InteractionService, useValue: interactionService },
        { provide: StatementService, useValue: statementService },
        { provide: WordScoringService, useValue: wordScoringService },

        // ----- DataSource -----
        { provide: DataSource, useValue: dataSource },

        // ----- STATEMENT_PRODUCER token -----
        { provide: 'STATEMENT_PRODUCER', useValue: statementProducer },
      ],
    }).compile();

    // Grab the service under test
    service = module.get(LexiconIngestService);
  });

  describe('ingestFromEvent', () => {
    it('ingests tokens and applies side effects', async () => {
      const user = { id: 1, clientId: 'client-1' } as User;

      const word = {
        id: 10,
        lemma: 'run',
        pos: 'verb',
      } as Word;

      const wordForm = {
        id: 100,
        form: 'running',
        word,
      } as WordForm;

      const event: NlpCompleteEvent = {
        clientId: 'client-1',
        language: 'en',
        interaction: { type: 'lexicon_import' },
        sentences: [
          {
            sentenceId: 's-1',
            text: 'I am running',
            tokens: [
              {
                surface: 'running',
                lemma: 'run',
                pos: 'verb',
              },
            ],
          },
        ],
      };

      userRepo.findOne.mockResolvedValue(user);
      wordRepo.find.mockResolvedValue([word]);
      wordFormRepo.find.mockResolvedValue([wordForm]);

      await service.ingestFromEvent(event);

      expect(profileService.setWord).toHaveBeenCalledWith(word.id, word.lemma);
      expect(profileService.addOrUpdateUserWordScore).toHaveBeenCalled();
      expect(profileService.markWordSeen).toHaveBeenCalledWith(
        'client-1',
        'en',
        word.id,
      );

      expect(interactionService.createInteraction).toHaveBeenCalledWith(
        'client-1',
        wordForm.id,
        'lexicon_import',
      );
    });

    it('creates a user if one does not exist', async () => {
      const user = { id: 1, clientId: 'client-1' } as User;

      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(user);
      userRepo.save.mockResolvedValue(user);

      wordRepo.find.mockResolvedValue([]);
      wordFormRepo.find.mockResolvedValue([]);

      const event: NlpCompleteEvent = {
        clientId: 'client-1',
        language: 'en',
        sentences: [],
      };

      await service.ingestFromEvent(event);

      expect(userRepo.create).toHaveBeenCalledWith({ clientId: 'client-1' });
      expect(userRepo.save).toHaveBeenCalled();
    });
  });
});
