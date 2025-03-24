import { Module } from '@nestjs/common';
import { StatementModule } from 'src/statement/statement.module';
import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';

@Module({
  imports: [StatementModule],
  controllers: [TranslationController],
  providers: [TranslationService],
})
export class TranslationModule { }
