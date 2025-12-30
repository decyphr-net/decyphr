import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ChatService } from './chat.service';
import ChatMessagePayload from './dtos/chat-message.dto';

@Controller()
export class ChatAiConsumer {
  private readonly logger = new Logger(ChatAiConsumer.name);

  constructor(private readonly chatService: ChatService) { }

  @MessagePattern('chat.full')
  async handleChatMessage(@Payload() payload: ChatMessagePayload) {
    this.logger.log(
      `📥 Received ChatMessagePayload: ${JSON.stringify(payload)}`,
    );

    await this.chatService.handleUserMessage(payload);
  }
}
