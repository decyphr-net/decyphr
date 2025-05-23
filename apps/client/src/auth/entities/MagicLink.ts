import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './User';

/**
 * The MagicLink entity represents a temporary, one-time-use token
 * that allows users to authenticate without a password.
 * Typically used for passwordless login or email-based authentication.
 */
@Entity()
export class MagicLink {
  /**
   * Auto-generated primary key identifier for the magic link.
   */
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * Secure random token string used to authenticate the user.
   */
  @Column()
  token!: string;

  /**
   * Timestamp indicating when the token expires.
   * After this time, the token is no longer valid.
   */
  @Column()
  expiresAt!: Date;

  /**
   * Timestamp of when the magic link was created.
   * Automatically set upon insertion.
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * The user who owns this magic link.
   * Many magic links can be associated with a single user.
   */
  @ManyToOne('User', 'magicLinks')
  user!: User;
}
