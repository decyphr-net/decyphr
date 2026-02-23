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
import { ActivityType, GoalPeriodType, GoalStatus, GoalTargetType } from './focus.types';

@Entity('goals')
@Index('idx_goals_client_status_period', ['clientId', 'status', 'periodStart', 'periodEnd'])
@Check('CHK_goal_period', '`periodStart` < `periodEnd`')
@Check('CHK_goal_target_positive', '`targetValue` > 0')
export class Goal {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'int', nullable: true })
  userId!: number | null;

  @Column({ type: 'varchar', length: 128 })
  clientId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'enum', enum: ['weekly', 'monthly', 'yearly', 'custom'] })
  periodType!: GoalPeriodType;

  @Column({ type: 'datetime' })
  periodStart!: Date;

  @Column({ type: 'datetime' })
  periodEnd!: Date;

  @Column({ type: 'enum', enum: ['time_minutes', 'session_count', 'unit_count'] })
  targetType!: GoalTargetType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  targetValue!: string;

  @Column({
    type: 'enum',
    enum: ['reading', 'course_material', 'listening', 'conversation', 'writing', 'review', 'other'],
    nullable: true,
  })
  activityType!: ActivityType | null;

  @Column({ type: 'enum', enum: ['active', 'completed', 'archived'], default: 'active' })
  status!: GoalStatus;

  @OneToMany(() => GoalEntry, (entry) => entry.goal)
  entries!: GoalEntry[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
