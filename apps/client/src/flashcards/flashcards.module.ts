import { Module } from '@nestjs/common';

import { FlashcardsController } from './flashcards.controller';

@Module({
  controllers: [FlashcardsController],
})
export class FlashcardsModule { }
