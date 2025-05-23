export default interface ChatMessagePayload {
  /**
   * The type of message event, must be 'message'.
   */
  type: 'message';

  /**
   * The unique identifier for the chat session.
   */
  chatId: string;

  /**
   * The unique client identifier associated with the user.
   */
  clientId: string;

  /**
   * The unique bot identifier for the chat session.
   */
  botId: number;

  /**
   * The array of messages exchanged in the chat session.
   */
  messages: Array<{
    role: 'user' | 'bot';
    content: string;
  }>;

  /**
   * The language to translate to.
   */
  langToTranslateTo: string;
}
