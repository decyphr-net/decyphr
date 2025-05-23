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

/**
 * Chat entity represents a chat session between a client and a bot.
 * Each chat session contains multiple messages.
 */
@Entity('chats')
export class Chat {
  /**
   * Unique identifier for the chat session.
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Client identifier that initiated the chat.
   */
  @Column({ name: 'clientId', nullable: false })
  clientId: string;

  /**
   * Identifier for the bot the user is interacting with.
   */
  @Column({ name: 'botId', nullable: false })
  botId: number;

  /**
   * Language used for the chat (e.g., 'ga-IE', 'pt-BR').
   */
  @Column({ name: 'language', nullable: false })
  language: string;

  /**
   * List of messages exchanged in this chat session.
   */
  @OneToMany(() => Message, (message) => message.chat, {
    cascade: true,
    eager: true, // Automatically loads related messages with each Chat
  })
  messages: Relation<Message[]>;

  /**
   * Timestamp indicating when the chat was created.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Timestamp indicating the last time the chat was updated.
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/**
 * Message entity represents a single message in a chat session.
 * Can be either from the user or the bot.
 */
@Entity('messages')
export class Message {
  /**
   * Unique identifier for the message.
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Role of the sender (either 'user' or 'bot').
   */
  @Column({
    name: 'role',
    type: 'enum',
    enum: ['user', 'bot'],
    nullable: false,
  })
  role: 'user' | 'bot';

  /**
   * Text content of the message.
   */
  @Column({ name: 'content', type: 'text', nullable: false })
  content: string;

  /**
   * Reference to the chat this message belongs to.
   */
  @ManyToOne(() => Chat, (chat) => chat.messages, {
    onDelete: 'CASCADE',
  })
  chat: Relation<Chat>;

  /**
   * Timestamp indicating when the message was created.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Timestamp indicating the last time the message was updated.
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
