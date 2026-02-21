import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaMessagingModule } from '@decyphr/messaging';

import { PhrasebookController } from './phrasebook.controller';
import { PhrasebookService } from './phrasebook.service';
import { Phrase, PhraseToken } from './phrasebook.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Phrase, PhraseToken]),
    KafkaMessagingModule.register({
      client: {
        brokers: ['kafka:9092'],
      },
      consumer: {
        groupId: 'phrasebook-producer-group',
      },
    }),
  ],
  controllers: [PhrasebookController],
  providers: [PhrasebookService],
  exports: [],
})
export class PhrasebookModule { }
