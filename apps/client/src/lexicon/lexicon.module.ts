import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { RedisModule } from 'src/utils/redis/redis.module';
import { LexiconController } from './lexicon.controller';
import { LexiconService } from './lexicon.service';

@Module({
  controllers: [LexiconController],
  imports: [AuthModule, RedisModule],
  providers: [
    {
      provide: LexiconService,
      useFactory: (redisClient) => new LexiconService(redisClient),
      inject: ['REDIS']
    }
  ],
})
export class LexiconModule { }
