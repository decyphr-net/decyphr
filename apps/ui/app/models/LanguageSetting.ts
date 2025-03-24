import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './User';

@Entity()
export class LanguageSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstLanguage: string;

  @Column()
  targetLanguage: string;

  @Column()
  immersionLevel: 'normal' | 'full';

  @ManyToOne(() => User, (user) => user.languageSettings)
  user: User;
}
