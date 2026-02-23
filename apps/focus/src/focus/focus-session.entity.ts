import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GoalEntry } from './goal-entry.entity';
import { ActivityType, FocusMode, FocusStatus } from './focus.types';

@Entity('focus_sessions')
@Index('idx_focus_client_status_started', ['clientId', 'status', 'startedAt'])
@Check('CHK_focus_planned_seconds_nonneg', '`plannedSeconds` IS NULL OR `plannedSeconds` >= 0')
@Check('CHK_focus_actual_seconds_nonneg', '`actualSeconds` >= 0')
export class FocusSession {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'int', nullable: true })
  userId!: number | null;

  @Column({ type: 'varchar', length: 128 })
  clientId!: string;

  @Column({ type: 'enum', enum: ['time', 'goal'] })
  mode!: FocusMode;

  @Column({
    type: 'enum',
    enum: ['reading', 'course_material', 'listening', 'conversation', 'writing', 'review', 'other'],
    default: 'course_material',
  })
  activityType!: ActivityType;

  @Column({ type: 'text', nullable: true })
  goalText!: string | null;

  @Column({ type: 'int', nullable: true })
  plannedSeconds!: number | null;

  @Column({ type: 'int', default: 0 })
  actualSeconds!: number;

  @Column({ type: 'enum', enum: ['running', 'paused', 'completed', 'cancelled'], default: 'running' })
  status!: FocusStatus;

  @Column({ type: 'datetime' })
  startedAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  endedAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  pausedAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  pauseAccumulatedSeconds!: number;

  @Column({ type: 'json', nullable: true })
  metadataJson!: Record<string, unknown> | null;

  @OneToMany(() => GoalEntry, (entry) => entry.focusSession)
  goalEntries!: GoalEntry[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
