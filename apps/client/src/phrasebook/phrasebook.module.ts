import { Module } from '@nestjs/common';

import { PhrasebookController } from './phrasebook.controller';
import { PhrasebookService } from './phrasebook.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PhrasebookController],
  providers: [PhrasebookService],
})
export class PhrasebookModule { }
