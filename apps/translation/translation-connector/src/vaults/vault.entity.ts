import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { VaultAttempt } from './vault-attempt.entity';


@Entity()
export class VaultEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ length: 2 })
  lang: string;

  @Column()
  clientId: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => VaultAttempt, (attempt) => attempt.vault)
  attempts: VaultAttempt[];
}
