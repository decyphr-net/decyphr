import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaMessagingModule } from '@decyphr/messaging';

import {
  Flashcard,
  FlashcardAttempt,
  FlashcardPack,
} from './flashcards.entity';
import { FlashcardsController } from './flashcards.controller';
import { FlashcardsService } from './flashcards.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FlashcardPack, Flashcard, FlashcardAttempt]),
    KafkaMessagingModule.register({
      client: {
        brokers: ['kafka:9092'],
      },
      consumer: {
        groupId: 'flashcards-producer-group',
      },
    }) as any,
  ],
  controllers: [FlashcardsController],
  providers: [FlashcardsService],
})
export class FlashcardsModule {}
