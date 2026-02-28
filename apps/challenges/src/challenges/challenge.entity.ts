import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ChallengeStatus = 'active' | 'completed';
export type ChallengeType = 'real_world_phrase_use';

@Entity('user_challenges')
@Index('idx_user_challenges_client_status', ['clientId', 'status'])
@Index('idx_user_challenges_client_key_unique', ['clientId', 'challengeKey'], {
  unique: true,
})
export class Challenge {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ type: 'varchar', length: 191 })
  clientId!: string;

  @Column({ type: 'varchar', length: 191 })
  challengeKey!: string;

  @Column({ type: 'varchar', length: 64 })
  challengeType!: ChallengeType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  sourceCourseSlug!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sourceCourseTitle!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  sourceLessonSlug!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sourceLessonTitle!: string | null;

  @Column({ type: 'enum', enum: ['active', 'completed'], default: 'active' })
  status!: ChallengeStatus;

  @Column({ type: 'datetime', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
