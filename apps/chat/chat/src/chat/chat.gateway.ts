import { Inject, Logger, forwardRef } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatGatewayPayload, ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust this for production
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  // Tracks clientId → socket.id mapping
  private clientMap = new Map<string, string>();

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) { }

  afterInit(server: Server) {
    this.logger.log('🚀 ChatGateway initialized');
  }

  handleConnection(client: Socket) {
    const clientId = client.handshake.query.clientId as string;

    if (clientId) {
      this.clientMap.set(clientId, client.id);
      client.join(clientId); // Each client joins a room based on their clientId
      this.logger.log(
        `🟢 Client connected: ${client.id} (clientId=${clientId})`,
      );
    } else {
      this.logger.warn(`⚠️ Client connected without a clientId: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    const clientId = [...this.clientMap.entries()].find(
      ([_, socketId]) => socketId === client.id,
    )?.[0];

    if (clientId) {
      this.clientMap.delete(clientId);
      this.logger.log(
        `🔴 Client disconnected: ${client.id} (clientId=${clientId})`,
      );
    } else {
      this.logger.log(`🔴 Client disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() clientId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(clientId);
    this.logger.debug(`📥 Client ${client.id} joined room: ${clientId}`);
  }

  @SubscribeMessage('chat')
  async onChatMessage(@MessageBody() payload: ChatGatewayPayload) {
    this.logger.debug(`📩 Received chat payload: ${JSON.stringify(payload)}`);
    await this.chatService.handleGatewayPayload(payload);
  }

  /**
   * Emits a message back to the frontend for a specific client.
   * @param clientId - The client identifier.
   * @param message - The message payload to send.
   */
  sendMessageToClient(clientId: string, message: any) {
    this.server.to(clientId).emit('chatMessage', message);
    this.logger.debug(
      `📤 Sent message to clientId=${clientId}: ${JSON.stringify(message)}`,
    );
  }
}
