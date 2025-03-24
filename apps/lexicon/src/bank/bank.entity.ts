import {
  Interaction,
  UserWordStatistics,
} from 'src/interaction/interaction.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Represents a word entity in the system, including its token, part-of-speech tag,
 * language, and lemma. Each word can have multiple associated interactions.
 */
@Entity('words')
export class Word {
  /**
   * Unique identifier for each word.
   * This is the primary key for the word entity.
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * The word token, which represents the word in its surface form.
   * This field is required and must be a string with a maximum length of 50 characters.
   */
  @Column({ name: 'token', nullable: false, length: 50 })
  word: string;

  /**
   * The part-of-speech tag for the word, indicating its grammatical role.
   * This field is required and must be a string.
   */
  @Column({ name: 'tag', nullable: false })
  tag: string;

  /**
   * The language in which the word is used.
   * This field is required and must be a string.
   */
  @Column({ name: 'language', nullable: false })
  language: string;

  /**
   * The lemma (base form) of the word.
   * This field is required and must be a string with a maximum length of 15 characters.
   */
  @Column({ name: 'lemma', nullable: false, length: 15 })
  lemma: string;

  /**
   * A list of interactions associated with this word.
   * Each interaction represents a user's engagement with the word.
   */
  @OneToMany(() => Interaction, (interaction) => interaction.word)
  interactions: Interaction[];
}

/**
 * Represents a user entity, uniquely identified by their clientId. Each user can have multiple associated interactions.
 */
@Entity('users')
export class User {
  /**
   * Unique identifier for each user.
   * This is the primary key for the user entity.
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * A unique client identifier assigned to each user.
   * This field is required, must be a string, and is unique across all users.
   */
  @Column({ name: 'clientId', nullable: false, unique: true })
  clientId: string;

  /**
   * A list of interactions associated with this user.
   * Each interaction represents a user's engagement with words.
   */
  @OneToMany(() => Interaction, (interaction) => interaction.user)
  interactions: Interaction[];

  @OneToMany(() => UserWordStatistics, (uws) => uws.user)
  wordStatistics: UserWordStatistics[];
}
