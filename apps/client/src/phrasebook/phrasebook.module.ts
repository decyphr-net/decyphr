import { Module } from '@nestjs/common';

import { PhrasebookController } from './phrasebook.controller';
import { PhrasebookService } from './phrasebook.service';
import { AuthModule } from 'src/auth/auth.module';
import { KafkaModule } from 'src/utils/kafka/kafka.module';

@Module({
  imports: [AuthModule, KafkaModule],
  controllers: [PhrasebookController],
  providers: [PhrasebookService],
})
export class PhrasebookModule { }
