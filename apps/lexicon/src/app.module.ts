import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Word } from './bank/bank.entity';
import { BankModule } from './bank/bank.module';
import { CefrModule } from './cefr/cefr.module';
import { CommonModule } from './common/common.module';
import {
  Interaction,
  UserWordStatistics,
} from './interaction/interaction.entity';
import { InteractionModule } from './interaction/interaction.module';
import { LexiconModule } from './lexicon/lexicon.module';
import { Statement } from './statement/statement.entity';
import { StatementModule } from './statement/statement.module';
import { TranslationModule } from './translation/translation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mariadb',
        host: configService.get('MARIA_DB_HOST'),
        port: Number(configService.get('MARIA_DB_PORT')),
        username: configService.get('MARIA_DB_USERNAME'),
        password: configService.get('MARIA_DB_PASSWORD'),
        database: configService.get('MARIA_DB_DATABASE'),
        synchronize: true,
        entities: [Interaction, Statement, Word, User, UserWordStatistics],
      }),
    }),
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
