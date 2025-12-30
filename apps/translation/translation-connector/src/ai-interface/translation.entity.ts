import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn
} from 'typeorm';

@Entity()
export class Translation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientId: string;

  @Column('text')
  originalText: string;

  @Column()
  targetLanguage: string;

  @Column('text')
  translated: string;

  @CreateDateColumn()
  createdAt: Date;
}
