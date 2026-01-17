import { Word } from 'src/bank/bank.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Represents a stored linguistic statement (sentence or phrase)
 * derived from NLP ingestion events.
 *
 * Statements are used for:
 * - learning context
 * - example sentences
 * - spaced repetition
 * - traceability of user exposure
 */
@Entity('statements')
export class Statement {
  @PrimaryGeneratedColumn()
  id: number;

  // Original text of the statement
  @Column({ name: 'text', type: 'varchar', length: 2000, nullable: false })
  text: string;

  // Optional meaning for the statement
  @Column({ name: 'meaning', type: 'varchar', length: 2000, nullable: true })
  meaning?: string;

  // ISO language code
  @Column({ name: 'language', nullable: false, length: 10 })
  language: string;

  // Source (nlp, manual, etc.)
  @Column({ name: 'source', nullable: false, length: 30 })
  source: string;

  // Client identifier
  @Column({ name: 'clientId', nullable: false })
  clientId: string;

  // Fingerprint for deduplication
  @Column({ name: 'fingerprint', nullable: false, length: 64, unique: true })
  fingerprint: string;

  // Timestamp of creation
  @Column({ name: 'createdAt', type: 'timestamp', nullable: false })
  createdAt: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pronunciation?: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  translation?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  translationLanguage?: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  example?: string;

  @Column({ type: 'varchar', length: 4000, nullable: true })
  notes?: string;

  @OneToMany(() => StatementToken, (token) => token.statement)
  tokens: StatementToken[];

  @Column({ type: 'varchar', length: 36, nullable: true, unique: true })
  requestId?: string;
}

@Entity('statement_tokens')
export class StatementToken {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Statement, { onDelete: 'CASCADE' })
  statement: Statement;

  @ManyToOne(() => Word)
  word: Word;

  @Column()
  position: number;

  @Column({ length: 100 })
  surface: string;

  @Column({ nullable: false, length: 50 })
  lemma?: string;

  @Column({ length: 100 })
  pos: string;
}
