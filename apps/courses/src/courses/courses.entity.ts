import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('course_progress')
@Index('idx_course_progress_client_course_lesson_unique', ['clientId', 'courseSlug', 'lessonSlug'], {
  unique: true,
})
@Index('idx_course_progress_client_status', ['clientId', 'status'])
export class CourseProgress {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ type: 'varchar', length: 191 })
  clientId!: string;

  @Column({ type: 'varchar', length: 128 })
  courseSlug!: string;

  @Column({ type: 'varchar', length: 128 })
  lessonSlug!: string;

  @Column({ type: 'varchar', length: 64 })
  contentVersion!: string;

  @Column({ type: 'enum', enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' })
  status!: 'not_started' | 'in_progress' | 'completed';

  @Column({ type: 'int', default: 0 })
  progressPercent!: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  lastBlockId!: string | null;

  @Column({ type: 'int', unsigned: true, default: 0 })
  timeSpentSec!: number;

  @Column({ type: 'datetime', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'datetime' })
  lastSeenAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity('course_lexicon_events')
@Index('idx_course_lexicon_events_client_event_unique', ['clientId', 'eventId'], {
  unique: true,
})
@Index('idx_course_lexicon_events_client_created', ['clientId', 'createdAt'])
export class CourseLexiconEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ type: 'varchar', length: 191 })
  clientId!: string;

  @Column({ type: 'varchar', length: 128 })
  courseSlug!: string;

  @Column({ type: 'varchar', length: 128 })
  lessonSlug!: string;

  @Column({ type: 'enum', enum: ['render', 'hover'] })
  source!: 'render' | 'hover';

  @Column({ type: 'varchar', length: 128 })
  eventId!: string;

  @Column({ type: 'varchar', length: 64 })
  contentVersion!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
