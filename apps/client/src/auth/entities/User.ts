import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LanguageSetting } from '../../settings/entities/LanguageSetting';
import { MagicLink } from './MagicLink';

/**
 * The User entity represents a user of the application.
 * Each user has a unique email and client ID, along with metadata such as creation date.
 * A user can have multiple language learning settings and multiple magic login links.
 */
@Entity()
export class User {
  /**
   * Auto-generated primary key identifier for the user.
   */
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * Unique email address used for identification or login.
   */
  @Column({ unique: true })
  email!: string;

  /**
   * Unique client ID used to associate the user across different services (e.g. WebSocket, Kafka).
   */
  @Column({ unique: true })
  clientId!: string;

  /**
   * Timestamp of when the user account was created.
   * Automatically set when the user is first persisted.
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * List of language learning settings associated with the user.
   * Each setting contains the user's preferences for a particular language pair.
   */
  @OneToMany('LanguageSetting', 'user')
  languageSettings!: LanguageSetting[];

  /**
   * Magic links issued to this user for passwordless login.
   * Each magic link includes a token and expiry date.
   */
  @OneToMany('MagicLink', 'user')
  magicLinks!: MagicLink[];
}
