export default interface ChatMessagePayload {
  type: 'message';
  chatId: string;
  messages: Array<{ role: 'user' | 'bot'; content: string }>;
}
