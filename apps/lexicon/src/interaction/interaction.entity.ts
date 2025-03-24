import { User, Word } from 'src/bank/bank.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
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

  /**
   * The user associated with this word statistic.
   * This relationship links the statistics to a specific user.
   */
  @ManyToOne(() => User, (user) => user.wordStatistics, { eager: false })
  @JoinColumn({ name: 'userId' }) // Ensure a userId column exists
  user: User;

  /**
   * The word associated with this statistic.
   * This relationship links the statistics to a specific word.
   */
  @ManyToOne(() => Word)
  word: Word;

  /**
   * The number of active interactions with this word by the user in the past 7 days.
   * Defaults to 0 if no active interactions have occurred in that period.
   */
  @Column({ default: 0 })
  activeInteractions7Days: number;

  /**
   * The number of passive interactions with this word by the user in the past 7 days.
   * Defaults to 0 if no passive interactions have occurred in that period.
   */
  @Column({ default: 0 })
  passiveInteractions7Days: number;

  /**
   * The number of active interactions with this word by the user in the past 30 days.
   * Defaults to 0 if no active interactions have occurred in that period.
   */
  @Column({ default: 0 })
  activeInteractions30Days: number;

  /**
   * The number of passive interactions with this word by the user in the past 30 days.
   * Defaults to 0 if no passive interactions have occurred in that period.
   */
  @Column({ default: 0 })
  passiveInteractions30Days: number;

  /**
   * The average correctness of active interactions with this word by the user in the past 7 days.
   * This value is a decimal with 2 decimal places. Defaults to 0 if no active interactions occurred in the period.
   */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageCorrectness7Days: number;

  /**
   * The average correctness of active interactions with this word by the user in the past 30 days.
   * This value is a decimal with 2 decimal places. Defaults to 0 if no active interactions occurred in the period.
   */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageCorrectness30Days: number;

  /**
   * The timestamp of the last time the word statistics were updated.
   * Defaults to the current timestamp at the time of insertion or update.
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdated: Date;

  /**
   * A calculated score that represents the user's interaction quality with this word.
   * The score is a decimal with 2 decimal places and defaults to 0.0.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  score: number;
}
