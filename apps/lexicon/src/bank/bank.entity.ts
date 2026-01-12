import {
  Interaction,
  UserWordStatistics,
} from 'src/interaction/interaction.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Word entity.
 * Unique index is on normalised only (no language) per earlier discussion.
 */
@Entity('words')
@Unique(['lemma', 'pos', 'language'])
@Index(['lemma', 'language'], { unique: true })
export class Word {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'token', nullable: false, length: 100 })
  word: string;

  @Column({ name: 'pos', nullable: false })
  pos: string;

  @Column({ name: 'language', nullable: false })
  language: string;

  @Column({ name: 'lemma', nullable: false, length: 50 })
  lemma: string;

  @Column({ length: 2, nullable: true })
  cefr?: string;

  @OneToMany(() => Interaction, (interaction) => interaction.word)
  interactions: Interaction[];

  @OneToMany(() => WordForm, (form) => form.word)
  forms: WordForm[];
}

@Entity('word_forms')
@Unique(['word', 'form'])
export class WordForm {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Word, (word) => word.forms, { nullable: false })
  @JoinColumn({ name: 'wordId' })
  word: Word;

  @Column({ length: 100 })
  form: string;

  @OneToMany(() => Interaction, (interaction) => interaction.wordForm)
  interactions: Interaction[];
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
