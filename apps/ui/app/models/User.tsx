import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { LanguageSetting } from './LanguageSetting';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  clientId: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => LanguageSetting, (languageSetting) => languageSetting.user)
  languageSettings: LanguageSetting[];
}
