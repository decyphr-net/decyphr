import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { FocusSession } from './focus-session.entity';
import { Goal } from './goal.entity';
import { GoalEntryType } from './focus.types';

@Entity('goal_entries')
@Index('idx_goal_entries_goal_occurred', ['goalId', 'occurredAt'])
@Check('CHK_goal_entry_value_positive', '`value` > 0')
export class GoalEntry {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  goalId!: string;

  @ManyToOne(() => Goal, (goal) => goal.entries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goalId' })
  goal!: Goal;

  @Column({ type: 'varchar', length: 128 })
  clientId!: string;

  @Column({ type: 'enum', enum: ['focus_session', 'manual_checkoff'] })
  entryType!: GoalEntryType;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 1 })
  value!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  focusSessionId!: string | null;

  @ManyToOne(() => FocusSession, (session) => session.goalEntries, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'focusSessionId' })
  focusSession!: FocusSession | null;

  @Column({ type: 'datetime' })
  occurredAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
