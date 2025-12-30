import { HttpService } from '@nestjs/axios';
import {
  Body,
  Controller,
  Get,
  Logger,
  OnModuleInit,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { readFile } from 'fs/promises';
import { EachMessagePayload } from 'kafkajs';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { KafkaService } from 'src/utils/kafka/kafka.service';
import { ChatGateway } from './chat.gateway';
import { ChatHistoryDto } from './dtos/chat-history.dto';
import StartChatPayload from './dtos/start-chat.dto';

@Controller()
export class ChatController implements OnModuleInit {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private gateway: ChatGateway,
    private readonly kafkaService: KafkaService,
    private readonly authService: AuthService,
    private readonly httpService: HttpService,
  ) { }

  /**
   * Initializes Kafka consumer to handle 'chat.started' messages.
   */
  async onModuleInit() {
    await this.kafkaService.consume(
      ['chat.started', 'chat.bot.response'],
      'chat-ui-group',
      async (payload) => {
        console.log(payload)
        const messageValue = payload.message.value?.toString() ?? '{}';
        console.log(messageValue)
        const parsed = JSON.parse(messageValue);
        console.log(parsed)

        if (parsed.type === 'started') {
          await this.handleChatStarted(payload);
        } else if (parsed.type === 'message') {
          await this.handleChatResponse(payload);
        }
      },
    );

    this.logger.log('Subscribed to Kafka topics chat.started, chat.bot.response');
  }

  /**
   * Serves the main chat page with embedded partial content.
   */
  @Get('/chat')
  async getChatPage(@Res() res: Response) {
    const layoutPath = join(__dirname, '..', '..', 'public', 'layout.html');
    const layout = await readFile(layoutPath, 'utf-8');
    const html = layout.replace('{{PARTIAL_ROUTE}}', '/chat-partial');
    return res.send(html);
  }

  /**
   * Serves the chat UI partial for HTMX dynamic swaps.
   */
  @Get('/chat-partial')
  async getChatPartial(@Res() res: Response) {
    const chatPartialPath = join(
      __dirname,
      '..',
      '..',
      'public',
      'pages',
      'dashboard',
      'chat',
      'chat.html',
    );
    const html = await readFile(chatPartialPath, 'utf-8');
    return res.send(html);
  }

  /**
   * Emits a Kafka message to start a new chat session.
   * @param body Object containing botId and language.
   * @param req Authenticated request containing session.
   */
  @Post('/start')
  async startChat(
    @Body() body: { botId: string; language: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);

    const payload: StartChatPayload = {
      type: 'start',
      clientId,
      botId: body.botId,
      language: body.language,
    };

    this.logger.debug(`Producing chat.start for clientId=${clientId}`);
    await this.kafkaService.emit('chat.start', payload);

    return { status: 'queued' };
  }

  /**
   * Receives a message from the frontend and emits it to the Kafka topic for chat handling.
   * @param body The request body containing message content, chatId, clientId, and full message history.
   */
  @Post('/chat')
  async sendMessageToKafka(
    @Body()
    body: {
      message: string;
      chatId: number;
      botId: number;
      messages: Array<{ role: 'user' | 'bot'; content: string }>;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    const user = await this.authService.getUserFromSession(req);

    const interaction = {
      type: 'chat_message',
      timestamp: new Date()
    };

    const payload = {
      type: 'message',
      chatId: body.chatId,
      botId: body.botId,
      clientId: user.clientId,
      messages: body.messages,
      interaction,
      langToTranslateTo: user.languageSettings?.[0]?.firstLanguage
    };

    this.logger.debug(
      `Producing chat.message for clientId=${user.clientId}, chatId=${body.chatId}`,
    );

    await this.kafkaService.emit('chat.message', payload);
    return { status: 'queued' };
  }

  /**
   * Retrieves chat history for the authenticated client by proxying to the chat microservice.
   * @param req Authenticated request containing session info.
   * @returns An array of chats with messages.
   */
  @Get('/chat/history')
  async getChatHistory(
    @Req() req: AuthenticatedRequest,
  ): Promise<ChatHistoryDto[]> {
    const clientId = await this.authService.getClientIdFromSession(req);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`http://chat:3008/chat/history`, {
          params: { clientId },
        }),
      );
      this.logger.debug(`Fetched chat history for clientId=${clientId}`);
      return response.data;
    } catch (err) {
      this.logger.error(
        `Failed to fetch chat history for clientId=${clientId}`,
        err,
      );
      return [];
    }
  }

  /**
   * Handles messages from the 'chat.started' Kafka topic.
   * @param message Kafka message payload.
   */
  private async handleChatStarted({ message }: EachMessagePayload) {
    try {
      const payload = JSON.parse(message.value?.toString() ?? '{}');

      if (
        payload.type === 'started' &&
        payload.clientId &&
        payload.chatId &&
        payload.greeting
      ) {
        this.gateway.server.to(payload.clientId).emit('chat-started', payload);
        this.logger.debug(
          `📤 Emitted chat-started for clientId=${payload.clientId}`,
        );
      }
    } catch (err) {
      this.logger.error('[handleChatStarted error]', err);
    }
  }

  private async handleChatResponse({ message }: EachMessagePayload) {
    try {
      const payload = JSON.parse(message.value?.toString() ?? '{}');
      this.logger.debug(
        `🔍 Received message on chat.response: ${JSON.stringify(payload)}`,
      );

      if (
        payload.type === 'message' &&
        payload.clientId &&
        payload.chatId &&
        Array.isArray(payload.messages)
      ) {
        const lastMessage = payload.messages[payload.messages.length - 1];
        const reply = lastMessage?.role === 'bot' ? lastMessage.content : null;

        if (reply) {
          this.gateway.server.to(payload.clientId).emit('chat-response', {
            chatId: +payload.chatId,
            reply,
            fullPayload: payload,
          });
          this.logger.debug(
            `📤 Emitted chat-response for clientId=${payload.clientId}`,
          );
        } else {
          this.logger.warn(
            `⚠️ No bot reply found in payload for chatId=${payload.chatId}`,
          );
        }
      } else {
        this.logger.warn(
          `⚠️ Ignored malformed chat.response payload: ${JSON.stringify(payload)}`,
        );
      }
    } catch (err) {
      this.logger.error('[handleChatResponse error]', err);
    }
  }
}
