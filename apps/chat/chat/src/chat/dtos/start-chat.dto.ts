export default interface StartChatPayload {
  type: 'start';
  clientId: string;
  botId: string;
  language: string;
}
