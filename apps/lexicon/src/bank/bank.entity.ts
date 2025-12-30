import {
  Interaction,
  UserWordStatistics,
} from 'src/interaction/interaction.entity';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Deterministic normalisation helper (small & dependency-free).
 *
 * Important fixes:
 * - punctuation removal happens before final trim so we don't return a single
 *   space ' ' for tokens that are only punctuation.
 * - returns empty string '' when the resulting token is empty so entity hook
 *   can set normalised -> null and avoid inserting empty/space values.
 */
function computeNormalised(value?: string): string {
  if (!value) return '';
  // Unicode normalization and diacritic folding
  let s = value.normalize('NFKC');
  s = s.normalize('NFD').replace(/\p{Diacritic}/gu, '').normalize('NFC');

  // Lowercase and collapse whitespace/punctuation in a safe order:
  s = s.toLowerCase();

  // Replace non-letter/number/apostrophe/hyphen with a single space
  s = s.replace(/[^\p{L}\p{N}'\-]+/gu, ' ');

  // Collapse multiple spaces, then trim leading/trailing spaces
  s = s.replace(/\s+/g, ' ').trim();

  // If result is empty after trimming, return empty string
  if (s.length === 0) return '';

  // Truncate to safe length
  if (s.length > 100) s = s.slice(0, 100);
  return s;
}

/**
 * Word entity.
 * Unique index is on normalised only (no language) per earlier discussion.
 */
@Entity('words')
@Index(['normalised', 'language'], { unique: true })
export class Word {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'token', nullable: false, length: 100 })
  word: string;

  // Keep nullable for safe deployment/backfill; will set to NOT NULL after backfill.
  @Column({ name: 'normalised', nullable: true, length: 100 })
  normalised: string | null;

  @Column({ name: 'tag', nullable: false })
  tag: string;

  @Column({ name: 'language', nullable: false })
  language: string;

  @Column({ name: 'lemma', nullable: false, length: 50 })
  lemma: string;

  @OneToMany(() => Interaction, (interaction) => interaction.word)
  interactions: Interaction[];

  @BeforeInsert()
  @BeforeUpdate()
  ensureNormalised() {
    // Compute canonical normalised form from surface 'word' if normalised absent/empty;
    // if computeNormalised returns empty string, set normalised to null to avoid empty-string
    // unique-index collisions.
    const computed = computeNormalised(this.normalised || this.word || '');
    this.normalised = computed === '' ? null : computed;
  }
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'clientId', nullable: false, unique: true })
  clientId: string;

  @OneToMany(() => Interaction, (interaction) => interaction.user)
  interactions: Interaction[];

  @OneToMany(() => UserWordStatistics, (uws) => uws.user)
  wordStatistics: UserWordStatistics[];
}