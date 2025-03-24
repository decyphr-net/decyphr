import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat, Message } from './chat.entity';
import { ChatGateway } from './chat.gateway';
import ChatMessagePayload from './dtos/chat-message.dto';
import StartChatPayload from './dtos/start-chat.dto';

export type ChatGatewayPayload = StartChatPayload | ChatMessagePayload;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) { }

  async handleGatewayPayload(payload: ChatGatewayPayload): Promise<void> {
    if (payload.type === 'start') {
      return this.startChat(payload);
    }
  }

  private async startChat(data: StartChatPayload): Promise<void> {
    this.logger.log(
      `🔹 Starting new chat: clientId=${data.clientId}, botId=${data.botId}, language=${data.language}`,
    );

    const chat = this.chatRepository.create({
      clientId: data.clientId,
      botId: +data.botId,
      language: data.language,
    });

    await this.chatRepository.save(chat);
    this.logger.log(`✅ Chat session stored with id=${chat.id}`);

    const greetingContent = this.getGreetingForLanguage(data.language);
    const greeting = this.messageRepository.create({
      chat,
      role: 'bot',
      content: greetingContent,
    });

    await this.messageRepository.save(greeting);

    // Emit the greeting back to the frontend
    this.chatGateway.sendMessageToClient(data.clientId, {
      chatId: chat.id,
      role: 'bot',
      content: greetingContent,
    });

    this.logger.log(`🤖 Sent greeting message to chatId=${chat.id}`);
  }

  private getGreetingForLanguage(language: string): string {
    switch (language.toLowerCase()) {
      case 'ga':
        return 'Dia dhuit! Conas atá tú?';
      case 'pt':
      case 'pt-br':
        return 'Olá! Como vai você?';
      case 'en':
      default:
        return 'Hello! How can I help you today?';
    }
  }
}
