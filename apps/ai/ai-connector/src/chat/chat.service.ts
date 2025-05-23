import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { EnrichmentService } from 'src/enrichment/enrichment.service';
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
    private readonly enrichmentService: EnrichmentService
  ) { }

  /**
   * Handles a user message by generating an AI response and emitting it back.
   * @param payload Chat message payload from Kafka
   */
  async handleUserMessage(payload: ChatMessagePayload): Promise<void> {
    if (payload.type !== 'message') {
      this.logger.warn(`Ignored payload with invalid type: ${payload.type}`);
      return;
    }

    await this.enrichmentService.enrichChatMessage(payload, 'active');

    try {
      const bot = await this.getBotFromRedis(payload.botId);

      const response = await this.groq.generateResponseFromChat(payload, bot);
      this.logger.log(`✅ Generated response for chatId=${payload.chatId}`);

      const newBotMessage: { role: 'bot'; content: string } = {
        role: 'bot',
        content: response,
      };

      const updatedMessages = [...payload.messages, newBotMessage];

      await this.emitMessageResponse({
        ...payload,
        messages: updatedMessages,
      });


      await this.enrichmentService.enrichChatMessage(payload, 'passive');
    } catch (error) {
      this.logger.error(
        `❌ Failed to handle user message for chatId=${payload.chatId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Emits the chat response to the Kafka topic.
   * @param payload Updated payload including the bot's reply
   */
  async emitMessageResponse(payload: ChatMessagePayload): Promise<void> {
    try {
      await this.chatClient.emit('chat.response', payload);
      this.logger.log(
        `📤 Emitted 'chat.response' for chatId=${payload.chatId} with ${payload.messages.length} messages`,
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
