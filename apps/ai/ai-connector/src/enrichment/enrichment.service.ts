import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { BotDto } from 'src/chat/dtos/bot.dto';
import ChatMessagePayload from 'src/chat/dtos/chat-message.dto';
import { GroqProvider } from 'src/providers/groq.provider';
import { RedisService } from 'src/utils/redis/redis.service';

@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);

  constructor(
    @Inject('ENRICHMENT') private readonly kafkaClient: ClientKafka,
    private readonly groqProvider: GroqProvider,
    private readonly redis: RedisService,
  ) { }

  /**
   * Enriches and emits the relevant chat message (user or bot) to lexicon.
   */
  async enrichChatMessage(
    payload: ChatMessagePayload,
    interactionType: 'active' | 'passive',
  ): Promise<void> {
    const lastUserMessage = payload.messages
      .slice()
      .reverse()
      .find((msg) => msg.role === 'user');

    const lastBotMessage = payload.messages
      .slice()
      .reverse()
      .find((msg) => msg.role === 'bot');

    const bot: BotDto = await this.getBotFromRedis(payload.botId);

    const targetMessage = interactionType === 'active' ? lastUserMessage : lastBotMessage;

    if (!targetMessage?.content) {
      this.logger.warn(`No valid ${interactionType} message found for enrichment.`);
      return;
    }

    await this.enrichAndEmit(
      targetMessage.content,
      payload.clientId,
      bot.language,
      payload.langToTranslateTo,
      interactionType,
      'chat',
    );
  }

  /**
   * Enriches a simple piece of text and emits the enriched data to lexicon.
   */
  async enrichText(
    text: string,
    clientId: string,
    sourceLang: string,
    targetLang: string,
    source: 'translation' | 'manual',
  ): Promise<void> {
    await this.enrichAndEmit(
      text,
      clientId,
      sourceLang,
      targetLang,
      'active',
      source,
    );
  }

  /**
   * Core method to enrich text and emit it to Kafka in a consistent format.
   */
  private async enrichAndEmit(
    text: string,
    clientId: string,
    sourceLang: string,
    targetLang: string,
    interactionType: 'active' | 'passive',
    source: 'chat' | 'translation' | 'manual',
  ) {
    const translationResponse = await this.groqProvider.getStructuredResponse({
      text,
      sourceLang,
      targetLang,
    });

    await this.kafkaClient.emit(
      'lexicon.update',
      JSON.stringify({
        statement: text,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        translationResponse,
        timestamp: Date.now().toString(),
        source,
        clientId,
        interactionType,
      }),
    );

    this.logger.debug(
      `📤 Lexicon update emitted for ${interactionType} message from ${source}: ${text}`,
    );
  }

  /**
   * Retrieves the bot from Redis by its ID.
   */
  private async getBotFromRedis(botId: number): Promise<BotDto> {
    const botKey = `bot:${botId}`;
    const botData = await this.redis.client.get(botKey);
    if (!botData) {
      this.logger.warn(`Bot with ID ${botId} not found in Redis`);
      throw new NotFoundException(`Bot with ID ${botId} not found`);
    }
    return JSON.parse(botData);
  }
}
