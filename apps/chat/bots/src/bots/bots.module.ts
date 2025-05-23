import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from 'src/utils/redis/redis.module';
import { BotsController } from './bots.controller';
import { Bot } from './bots.entity';
import { BotsService } from './bots.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bot]), RedisModule],
  controllers: [BotsController],
  providers: [BotsService],
})
export class BotsModule { }
