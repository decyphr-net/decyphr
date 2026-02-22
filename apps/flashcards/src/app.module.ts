import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppDataSource } from './data-source';
import { FlashcardsModule } from './flashcards/flashcards.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot(AppDataSource.options),
    FlashcardsModule,
  ],
})
export class AppModule {}
