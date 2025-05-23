/**
 * Payload sent to initiate a new chat session.
 */
export default interface StartChatPayload {
  /** Type of the chat message event. Must be 'start' for chat initiation. */
  type: 'start';

  /** Unique identifier for the frontend client initiating the chat. */
  clientId: string;

  /** Identifier of the bot the user wants to chat with. */
  botId: string;

  /** Language code for the conversation (e.g. 'en', 'ga-IE'). */
  language: string;
}
