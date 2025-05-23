import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat, Message } from './chat.entity';
import { ChatHistoryDto } from './dtos/chat-history.dto';
import ChatMessagePayload from './dtos/chat-message.dto';
import StartChatPayload from './dtos/start-chat.dto';

export type ChatGatewayPayload = StartChatPayload | ChatMessagePayload;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject('CHAT') private readonly chatClient: ClientKafka,
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) { }

  async startChat(data: StartChatPayload): Promise<void> {
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

    const responsePayload = {
      type: 'started',
      chatId: chat.id,
      clientId: data.clientId,
      botId: data.botId,
      greeting: greetingContent,
    };

    try {
      await this.chatClient.emit('chat.started', responsePayload);
      this.logger.log(`📤 Emitted 'chat.started' for chatId=${chat.id}`);
    } catch (err) {
      this.logger.error(
        `❌ Failed to emit 'chat.started': ${err.message}`,
        err.stack,
      );
    }
  }

  async storeUserMessage(
    data: ChatMessagePayload,
    role: 'user' | 'bot',
  ): Promise<void> {
    this.logger.log(
      `💬 Storing user message for chatId=${data.chatId}, clientId=${data.clientId}`,
    );

    const chat = await this.chatRepository.findOne({
      where: { id: Number(data.chatId), clientId: data.clientId },
    });

    if (!chat) {
      this.logger.warn(
        `⚠️ Chat not found for chatId=${data.chatId}, clientId=${data.clientId}`,
      );
      return;
    }

    const latestUserMessage = data.messages
      .filter((msg) => msg.role === role)
      .at(-1);

    if (!latestUserMessage) {
      this.logger.warn(
        `⚠️ No latest user message found for chatId=${data.chatId}`,
      );
      return;
    }

    const messageEntity = this.messageRepository.create({
      chat,
      role,
      content: latestUserMessage.content,
    });

    await this.messageRepository.save(messageEntity);

    this.logger.log(`✅ Stored message for chatId=${data.chatId}`);
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

  async getChatHistoryForClient(clientId: string): Promise<ChatHistoryDto[]> {
    const chats = await this.chatRepository.find({
      where: { clientId },
      relations: ['messages'],
      order: { createdAt: 'DESC' },
    });

    return chats.map((chat) => ({
      id: chat.id,
      botId: chat.botId,
      language: chat.language,
      messages: chat.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    }));
  }
}
