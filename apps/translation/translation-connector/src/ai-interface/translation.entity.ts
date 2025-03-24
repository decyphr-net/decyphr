import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
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
  detectedLanguage: string;

  @Column()
  targetLanguage: string;

  @Column('text')
  translatedText: string;

  @Column('simple-array')
  alternatives: string[];

  @OneToMany(() => WordBreakdown, (breakdown) => breakdown.translation, {
    cascade: true,
  })
  breakdown: WordBreakdown[];

  @CreateDateColumn()
  createdAt: Date;
}

@Entity()
export class WordBreakdown {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Translation, (translation) => translation.breakdown, {
    onDelete: 'CASCADE',
  })
  translation: Translation;

  @Column()
  originalWord: string;

  @Column()
  translatedWord: string;

  @Column('text')
  alternatives: string;

  @Column()
  pos_tag: string;

  @Column()
  lemma: string;

  @Column()
  correctness: number;

  @Column()
  level: string;

  @Column()
  correctedWord: string;
}
