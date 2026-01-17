import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { TranslationsModule } from 'src/translations/translations.module';
import { KafkaModule } from 'src/utils/kafka/kafka.module';
import { RedisModule } from 'src/utils/redis/redis.module';
import { LexiconController } from './lexicon.controller';
import { LexiconService } from './lexicon.service';

@Module({
  imports: [AuthModule, RedisModule, KafkaModule, TranslationsModule],
  controllers: [LexiconController],
  providers: [LexiconService],
  exports: [LexiconService],
})
export class LexiconModule { }
