import { User, Word, WordForm } from 'src/bank/bank.entity';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';

/**
 * Represents a user interaction with a word. Stores information about the user, the
 * word, the interaction type, timestamp, and correctness of the interaction (if
 * applicable).
 */
@Entity('interactions')
export class Interaction {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * The user associated with this interaction.
   * This relationship links each interaction to a specific user.
   */
  @ManyToOne(() => User, (user) => user.interactions, { onDelete: 'CASCADE' })
  user: User;

  /**
   * The word that was interacted with by the user.
   * This relationship links the interaction to a specific word.
   */
  @ManyToOne(() => Word, { nullable: false })
  word: Word;

  /**
   * The timestamp of the interaction, indicating when the interaction occurred.
   * This field cannot be null.
   */
  @Column({
    name: 'timestamp',
    nullable: false,
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  timestamp: Date;

  /**
   * The type of interaction (e.g., 'passive' or 'active').
   * The default interaction type is 'passive'.
   */
  @Column({ name: 'type', nullable: false, default: 'passive' })
  type: string;

  /**
   * The correctness of the interaction, expressed as a float value.
   * This field is optional and may be null if the interaction type is passive.
   */
  @Column({ name: 'correctness', type: 'float', nullable: true })
  correctness?: number;

  @Column({ type: 'float', nullable: false, default: 0 })
  weight: number;

  @ManyToOne(() => WordForm, (wordForm) => wordForm.interactions)
  wordForm: WordForm;
}

/**
 * Stores statistics related to a user's interactions with words. This includes counts
 * of active and passive interactions, as well as the average correctness of the
 * interactions over the last 7 and 30 days.
 */
@Entity('user_word_statistics')
export class UserWordStatistics {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Word)
  word: Word;

  @Column({ type: 'float', default: 0 })
  weighted7Days: number;

  @Column({ type: 'float', default: 0 })
  weighted30Days: number;

  @Column({ type: 'int', default: 0 })
  totalInteractions7Days: number;

  @Column({ type: 'int', default: 0 })
  totalInteractions30Days: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdated: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  score: number;
}