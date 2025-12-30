import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { RedisService } from 'src/utils/redis/redis.service';
import { GroqProvider } from '../providers/groq.provider';
import ChatMessagePayload from './dtos/chat-message.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject('CHAT') private readonly chatClient: ClientKafka,
    private readonly groq: GroqProvider,
    private readonly redis: RedisService,
  ) { }

  private async emitNlpDelta(payload: ChatMessagePayload, content: string) {
    const delta = {
      type: "delta",
      chatId: payload.chatId,
      clientId: payload.clientId,
      botId: payload.botId,
      language: payload.language,
      text: content,
      interaction: {
        type: "chat_message_bot",
        timestamp: Date.now(),
      },
    };

    await this.chatClient.emit("chat.delta", delta);
  }

  /**
   * Handles a user message by generating an AI response and emitting it back.
   * @param payload Chat message payload from Kafka
   */
  async handleUserMessage(payload: ChatMessagePayload): Promise<void> {
    try {
      const bot = await this.getBotFromRedis(payload.botId);

      const response = await this.groq.generateResponseFromChat(payload, bot, payload.clientId);
      this.logger.log(`Generated response for chatId=${payload.chatId}`);

      const botMessage = {
        role: 'bot' as const,
        content: response,
      };

      // 1. Emit delta to DB + NLP
      await this.emitNlpDelta(payload, botMessage.content);

      // 2. Emit minimal response to UI
      await this.emitMessageResponse(payload, [botMessage]);

    } catch (error) {
      this.logger.error(
        `Failed to handle user message for chatId=${payload.chatId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Emits the chat response to the Kafka topic.
   * @param payload Updated payload including the bot's reply
   */
  async emitMessageResponse(payload: any, messages: any): Promise<void> {
    const msg = {
      type: "message",
      chatId: payload.chatId,
      clientId: payload.clientId,
      botId: payload.botId,
      language: payload.language,
      messages,
      interaction: {
        type: "chat_message_bot",
        timestamp: Date.now(),
      },
    };
    try {
      await this.chatClient.emit('chat.response', msg);
      this.logger.log(
        `📤 Emitted 'chat.response' for chatId=${msg.chatId} with ${msg.messages} messages`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to emit 'chat.response': ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Retrieves the bot from Redis by its ID.
   * @param botId The bot ID
   */
  private async getBotFromRedis(botId: number): Promise<any> {
    const botKey = `bot:${botId}`;
    const botData = await this.redis.client.get(botKey);
    if (!botData) {
      this.logger.warn(`Bot with ID ${botId} not found in Redis`);
      throw new NotFoundException(`Bot with ID ${botId} not found`);
    }

    return JSON.parse(botData);
  }
}
