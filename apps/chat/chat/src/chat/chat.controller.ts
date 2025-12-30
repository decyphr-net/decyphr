import {
  Controller,
  Get,
  Inject,
  Logger,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ChatService } from './chat.service';
import { ChatHistoryDto } from './dtos/chat-history.dto';
import ChatMessagePayload from './dtos/chat-message.dto';
import StartChatPayload from './dtos/start-chat.dto';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    @Inject(ChatService)
    private readonly chatService: ChatService,
  ) { }

  /**
   * Consumes messages from the `chat.start` topic to initiate a new chat session.
   * @param payload The StartChatPayload message from Kafka.
   */
  @MessagePattern('chat.start')
  async handleStartChat(@Payload() payload: StartChatPayload) {
    this.logger.log(`📥 Received StartChatPayload: ${JSON.stringify(payload)}`);

    if (payload.type !== 'start') {
      this.logger.warn(`Ignored payload with invalid type: ${payload.type}`);
      return;
    }

    try {
      await this.chatService.startChat(payload);
      this.logger.log(`✅ Chat started for clientId=${payload.clientId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to start chat: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Consumes messages from the `chat.message` topic to store a user's message.
   * @param payload The ChatMessagePayload message from Kafka.
   */
  @MessagePattern('chat.message')
  async handleUserMessage(@Payload() payload: ChatMessagePayload) {
    this.logger.log(
      `📥 Received ChatMessagePayload: ${JSON.stringify(payload)}`,
    );

    if (payload.type !== 'message') {
      this.logger.warn(`Ignored payload with invalid type: ${payload.type}`);
      return;
    }

    try {
      // store and get the stored DB message (with id + timestamp)
      const stored = await this.chatService.storeUserMessage(payload, 'user');

      this.logger.log(
        `✅ Stored & produced user message chatId=${payload.chatId}`,
      );

    } catch (error) {
      this.logger.error(
        `❌ Failed to store message: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Consumes messages from the `chat.message` topic to store a user's message.
   * @param payload The ChatMessagePayload message from Kafka.
   */
  @MessagePattern('chat.response')
  async handleBotMessage(@Payload() payload: ChatMessagePayload) {
    this.logger.log(
      `📥 Received ChatMessagePayload: ${JSON.stringify(payload)}`,
    );

    try {
      await this.chatService.storeUserMessage(payload, 'bot');
      this.logger.log(`✅ Stored bot message for chatId=${payload.chatId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to store message: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Retrieves all chats and their messages for the given clientId.
   * @param clientId - The unique identifier of the client.
   * @returns A list of chat sessions and their associated messages.
   */
  @Get('history')
  async getChatHistory(
    @Query('clientId') clientId: string,
  ): Promise<ChatHistoryDto[]> {
    if (!clientId) {
      throw new NotFoundException('Client ID is required');
    }

    return await this.chatService.getChatHistoryForClient(clientId);
  }
}
