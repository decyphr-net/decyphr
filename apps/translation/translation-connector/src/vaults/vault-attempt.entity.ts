import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { VaultEntry } from './vault.entity';

@Entity()
export class VaultAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => VaultEntry, (vault) => vault.attempts, { onDelete: 'CASCADE' })
  vault: VaultEntry;

  @Column({ type: 'text' })
  guess: string;

  @Column({ length: 2 })
  lang: string;

  @Column({ type: 'simple-json', nullable: true })
  evaluation: any;

  @Column({ type: 'datetime', nullable: true })
  evaluatedAt: Date;

  @Column()
  clientId: string;

  @CreateDateColumn()
  createdAt: Date;
}