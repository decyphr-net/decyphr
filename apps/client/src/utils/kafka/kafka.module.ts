import { Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { KTableService } from './ktable.service';

@Module({
  providers: [KafkaService, KTableService],
  exports: [KafkaService, KTableService],
})
export class KafkaModule { }
