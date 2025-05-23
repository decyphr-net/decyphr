import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class ChatGateway {
  private readonly logger = new Logger(ChatGateway.name);
  @WebSocketServer()
  server: Server;

  sendBotReply(reply: string, typingId: string, chatId: number) {
    this.server.emit('chat-response', {
      typingId,
      reply,
      chatId,
    });
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() clientId: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.debug(`📥 Client ${client.id} joined room: ${clientId}`);
    client.join(clientId);
  }
}
