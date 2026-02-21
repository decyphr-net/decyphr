import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Represents a stored linguistic phrase (sentence or phrase)
 * derived from NLP ingestion events.
 *
 * Phrases are used for:
 * - learning context
 * - example sentences
 * - spaced repetition
 * - traceability of user exposure
 */
@Entity('phrases')
export class Phrase {
  @PrimaryGeneratedColumn()
  id: number;

  // Original text of the phrase
  @Column({ name: 'text', type: 'varchar', length: 2000, nullable: false })
  text: string;

  // Optional meaning for the phrase
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

  @OneToMany(() => PhraseToken, (token) => token.phrase)
  tokens: PhraseToken[];

  @Column({ type: 'varchar', length: 36, nullable: true, unique: true })
  requestId?: string;
}

@Entity('phrase_tokens')
export class PhraseToken {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Phrase, { onDelete: 'CASCADE' })
  phrase: Phrase;

  @Column()
  word: string;

  @Column()
  position: number;

  @Column({ length: 100 })
  surface: string;

  @Column({ nullable: false, length: 50 })
  lemma?: string;

  @Column({ length: 100 })
  pos: string;
}
