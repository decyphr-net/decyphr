import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('flashcard_packs')
@Index('idx_flashcard_packs_client_id', ['clientId'])
export class FlashcardPack {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 191 })
  clientId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 12, default: 'ga' })
  language: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Flashcard, (card) => card.pack, { cascade: false })
  cards: Flashcard[];
}

@Entity('flashcards')
@Index('idx_flashcards_pack_id', ['packId'])
@Index('idx_flashcards_due_at', ['dueAt'])
export class Flashcard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  packId: number;

  @ManyToOne(() => FlashcardPack, (pack) => pack.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'packId' })
  pack: FlashcardPack;

  @Column({ type: 'text' })
  front: string;

  @Column({ type: 'text' })
  back: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pronunciation?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes?: string | null;

  @Column({ type: 'float', default: 2.5 })
  easeFactor: number;

  @Column({ type: 'int', default: 0 })
  intervalDays: number;

  @Column({ type: 'int', default: 0 })
  consecutiveCorrect: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column({ type: 'int', default: 0 })
  lapseCount: number;

  @Column({ type: 'datetime', nullable: true })
  lastReviewedAt?: Date | null;

  @Column({ type: 'datetime' })
  dueAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => FlashcardAttempt, (attempt) => attempt.card, { cascade: false })
  attempts: FlashcardAttempt[];
}

@Entity('flashcard_attempts')
@Index('idx_flashcard_attempts_card_id', ['cardId'])
@Index('idx_flashcard_attempts_created_at', ['createdAt'])
export class FlashcardAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  cardId: number;

  @ManyToOne(() => Flashcard, (card) => card.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cardId' })
  card: Flashcard;

  @Column({ type: 'varchar', length: 16 })
  grade: 'again' | 'hard' | 'good' | 'easy';

  @Column({ type: 'int', nullable: true })
  responseMs?: number | null;

  @Column({ type: 'datetime' })
  reviewedAt: Date;

  @Column({ type: 'float' })
  previousEaseFactor: number;

  @Column({ type: 'float' })
  nextEaseFactor: number;

  @Column({ type: 'int' })
  previousIntervalDays: number;

  @Column({ type: 'int' })
  nextIntervalDays: number;

  @Column({ type: 'datetime' })
  nextDueAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
