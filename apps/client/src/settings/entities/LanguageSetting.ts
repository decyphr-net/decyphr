import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../auth/entities/User';

/**
 * The LanguageSetting entity represents a user's language learning preferences,
 * including their native language, target language, and immersion level.
 * Each setting is associated with a specific user.
 */
@Entity()
export class LanguageSetting {
  /**
   * Auto-generated primary key identifier for the language setting record.
   */
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * The user's native or first language (e.g., 'en', 'pt-br', 'ga-ie').
   */
  @Column()
  firstLanguage!: string;

  /**
   * The target language the user is learning (e.g., 'pt-br', 'ga-ie').
   */
  @Column()
  targetLanguage!: string;

  /**
   * The level of immersion the user has selected.
   * - 'normal' may show more hints or translations.
   * - 'full' hides UI hints for a more immersive experience.
   */
  @Column()
  immersionLevel!: 'normal' | 'full';

  /**
   * The user to whom this language setting belongs.
   * Many settings can belong to one user.
   */
  @ManyToOne('User', 'languageSettings')
  user!: User;
}
