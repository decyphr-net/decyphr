import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FocusController } from './focus.controller';
import { FocusSession } from './focus-session.entity';
import { GoalEntry } from './goal-entry.entity';
import { Goal } from './goal.entity';
import { FocusService } from './focus.service';

@Module({
  imports: [TypeOrmModule.forFeature([FocusSession, Goal, GoalEntry])],
  controllers: [FocusController],
  providers: [FocusService],
})
export class FocusModule {}
