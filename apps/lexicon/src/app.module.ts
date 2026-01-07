import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BankModule } from './bank/bank.module';
import { CefrModule } from './cefr/cefr.module';
import { CommonModule } from './common/common.module';
import { AppDataSource } from './data-source';
import { InteractionModule } from './interaction/interaction.module';
import { LexiconModule } from './lexicon/lexicon.module';
import { StatementModule } from './statement/statement.module';
import { TranslationModule } from './translation/translation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, }),
    TypeOrmModule.forRoot(AppDataSource.options),
    CommonModule,
    LexiconModule,
    TranslationModule,
    BankModule,
    StatementModule,
    InteractionModule,
    CefrModule
  ],
})
export class AppModule { }
