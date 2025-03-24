import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'clientId', nullable: false })
  clientId: string;

  @Column({ name: 'botId', nullable: false })
  botId: number;

  @Column({ name: 'language', nullable: false })
  language: string;

  @OneToMany(() => Message, (message) => message.chat, {
    cascade: true,
    eager: true,
  })
  messages: Relation<Message[]>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'role',
    type: 'enum',
    enum: ['user', 'bot'],
    nullable: false,
  })
  role: 'user' | 'bot';

  @Column({ name: 'content', type: 'text', nullable: false })
  content: string;

  @ManyToOne(() => Chat, (chat) => chat.messages, {
    onDelete: 'CASCADE',
  })
  chat: Chat;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
