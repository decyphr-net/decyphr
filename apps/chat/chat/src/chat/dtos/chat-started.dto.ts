/**
 * Payload returned when a chat session is successfully started.
 */
export default interface ChatStartedPayload {
  /**
   * Type of the event. Always 'started' for this payload.
   */
  type: 'started';

  /**
   * Unique identifier of the newly created chat session.
   */
  chatId: number;

  /**
   * Identifier of the frontend client that initiated the chat.
   */
  clientId: string;

  /**
   * ID of the bot the user is chatting with.
   */
  botId: string;

  /**
   * Initial greeting message from the bot.
   */
  greeting: string;
}
