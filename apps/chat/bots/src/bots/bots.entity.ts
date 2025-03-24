import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bots')
export class Bot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false })
  gender: string;

  @Column({ nullable: false })
  age: number;

  @Column({ nullable: false })
  region: string;

  @Column({ nullable: false })
  city: string;

  @Column({ nullable: false })
  background: string;

  @Column({ nullable: false })
  occupation: string;

  @Column({ nullable: false })
  hobbies: string;

  @Column({ nullable: false })
  personal: string;

  @Column({ nullable: false })
  language: string;
}
