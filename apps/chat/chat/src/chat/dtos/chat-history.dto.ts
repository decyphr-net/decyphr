/**
 * Represents a single message in a chat session.
 */
export interface ChatHistoryMessageDto {
  /**
   * Unique identifier of the message.
   */
  id: number;

  /**
   * The role of the sender ('user' or 'bot').
   */
  role: 'user' | 'bot';

  /**
   * The text content of the message.
   */
  content: string;

  /**
   * The timestamp when the message was created.
   */
  createdAt: Date;
}

/**
 * Represents a chat session and its associated messages.
 */
export interface ChatHistoryDto {
  /**
   * Unique identifier of the chat session.
   */
  id: number;

  /**
   * Identifier of the bot the user interacted with.
   */
  botId: number;

  /**
   * Language code used in the chat (e.g. 'en', 'ga-IE').
   */
  language: string;

  /**
   * Array of messages exchanged in the chat session.
   */
  messages: ChatHistoryMessageDto[];
}
