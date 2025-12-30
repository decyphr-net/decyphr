export interface AIProvider {
  invoke(prompt: string): Promise<string>;
  invokeChat(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  ): Promise<string>;
}