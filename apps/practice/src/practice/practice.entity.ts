import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('practice_profiles')
@Index('idx_practice_profiles_client_id', ['clientId'])
@Index('idx_practice_profiles_due_at', ['dueAt'])
@Index('idx_practice_profiles_phrase_type_unique', ['clientId', 'phraseId', 'exerciseType'], {
  unique: true,
})
export class PracticeProfile {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ type: 'varchar', length: 191 })
  clientId!: string;

  @Column({ type: 'int', unsigned: true })
  phraseId!: number;

  @Column({ type: 'enum', enum: ['typed_translation', 'sentence_builder', 'cloze'] })
  exerciseType!: 'typed_translation' | 'sentence_builder' | 'cloze';

  @Column({ type: 'float', default: 2.5 })
  easeFactor!: number;

  @Column({ type: 'int', default: 0 })
  intervalDays!: number;

  @Column({ type: 'int', default: 0 })
  consecutiveCorrect!: number;

  @Column({ type: 'int', default: 0 })
  reviewCount!: number;

  @Column({ type: 'int', default: 0 })
  lapseCount!: number;

  @Column({ type: 'datetime', nullable: true })
  lastReviewedAt!: Date | null;

  @Column({ type: 'datetime' })
  dueAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}

@Entity('practice_attempts')
@Index('idx_practice_attempts_client_id', ['clientId'])
@Index('idx_practice_attempts_created_at', ['createdAt'])
@Index('idx_practice_attempts_phrase_id', ['phraseId'])
export class PracticeAttempt {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ type: 'varchar', length: 191 })
  clientId!: string;

  @Column({ type: 'int', unsigned: true })
  phraseId!: number;

  @Column({ type: 'enum', enum: ['typed_translation', 'sentence_builder', 'cloze'] })
  exerciseType!: 'typed_translation' | 'sentence_builder' | 'cloze';

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  profileId!: string | null;

  @ManyToOne(() => PracticeProfile, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'profileId' })
  profile!: PracticeProfile | null;

  @Column({ type: 'text' })
  promptText!: string;

  @Column({ type: 'text' })
  expectedAnswer!: string;

  @Column({ type: 'text', nullable: true })
  userAnswer!: string | null;

  @Column({ type: 'boolean', default: false })
  isCorrect!: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  score!: string;

  @Column({ type: 'int', nullable: true })
  latencyMs!: number | null;

  @Column({ type: 'int', default: 0 })
  hintsUsed!: number;

  @Column({ type: 'json', nullable: true })
  metadataJson!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
