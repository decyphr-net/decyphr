import ChatMessagePayload from 'src/chat/dtos/chat-message.dto';
import { z } from 'zod';

/**
 * Abstract base class for AI providers.
 *
 * This class defines a standard interface for obtaining structured responses
 * from AI models, ensuring consistency across different provider implementations.
 */
export abstract class BaseProvider {
  /**
   * Generates a structured response based on a given prompt and response schema.
   *
   * @param prompt - The input text that the AI model should process.
   * @param responseSchema - A Zod schema defining the expected structure of the response.
   * @returns A Promise resolving to a structured response matching the provided schema.
   */
  abstract getStructuredResponse<T extends z.ZodTypeAny>(
    prompt: string,
    responseSchema: T,
  ): Promise<z.infer<T>>;

  /**
   * Generates a plain natural language response based on the full chat history.
   *
   * @param payload - Chat history with user messages.
   * @returns A Promise resolving to a single AI-generated message.
   */
  abstract generateResponseFromChat(
    payload: ChatMessagePayload,
  ): Promise<string>;
}
