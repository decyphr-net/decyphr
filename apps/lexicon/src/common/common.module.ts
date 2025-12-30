import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RedisProvider } from './redis.provider';
import { NLPAdapter } from './tokeniser/adapters/nlp.adapter';
import { TokeniserService } from './tokeniser/tokeniser.service';

@Module({
  imports: [HttpModule],
  providers: [TokeniserService, NLPAdapter, RedisProvider],
  exports: [TokeniserService, RedisProvider],
})
export class CommonModule { }