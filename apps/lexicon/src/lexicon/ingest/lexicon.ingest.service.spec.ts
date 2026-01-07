import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getRepositoryToken } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';

import { User, Word, WordForm } from 'src/bank/bank.entity';
import { InteractionService } from 'src/interaction/interaction.service';
import { RedisProfileService } from '../profile.service';
import { LexiconIngestService } from './lexicon.ingest.service';
import { NlpCompleteEvent } from './lexicon.ingest.types';

describe('LexiconIngestService', () => {
  let service: LexiconIngestService;

  let userRepo: jest.Mocked<Repository<User>>;
  let wordRepo: jest.Mocked<Repository<Word>>;
  let wordFormRepo: jest.Mocked<Repository<WordForm>>;
  let connection: jest.Mocked<Connection>;

  let profile: jest.Mocked<RedisProfileService>;
  let interactionService: jest.Mocked<InteractionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LexiconIngestService,
        {
          provide: getConnectionToken(),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue({
              insert: jest.fn().mockReturnThis(),
              into: jest.fn().mockReturnThis(),
              values: jest.fn().mockReturnThis(),
              orIgnore: jest.fn().mockReturnThis(),
              execute: jest.fn(),
            }),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Word),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WordForm),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: RedisProfileService,
          useValue: {
            setWord: jest.fn(),
            addOrUpdateUserWordScore: jest.fn(),
            markWordSeen: jest.fn(),
          },
        },
        {
          provide: InteractionService,
          useValue: {
            createInteraction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(LexiconIngestService);

    userRepo = module.get(getRepositoryToken(User));
    wordRepo = module.get(getRepositoryToken(Word));
    wordFormRepo = module.get(getRepositoryToken(WordForm));
    connection = module.get(getConnectionToken());

    profile = module.get(RedisProfileService);
    interactionService = module.get(InteractionService);
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

      expect(profile.setWord).toHaveBeenCalledWith(word.id, word.lemma);
      expect(profile.addOrUpdateUserWordScore).toHaveBeenCalled();
      expect(profile.markWordSeen).toHaveBeenCalledWith(
        'client-1',
        'en',
        word.id,
      );

      expect(interactionService.createInteraction).toHaveBeenCalledWith(
        'client-1',
        word.id,
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
