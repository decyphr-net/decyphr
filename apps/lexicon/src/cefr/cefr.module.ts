/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User, Word } from 'src/bank/bank.entity';
import { UserWordStatistics } from 'src/interaction/interaction.entity';
import { CefrAssessmentService } from './cefr.service';

@Module({
    imports: [TypeOrmModule.forFeature([Word, User, UserWordStatistics]),],
    controllers: [],
    providers: [CefrAssessmentService],
})
export class CefrModule { }
