import { forwardRef, Inject, Logger } from '@nestjs/common';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AiInterfaceService } from './ai-interface.service';

/**
 * WebSocket Gateway that handles real-time communication between clients and the server.
 * It manages the message queue until the WebSocket connection is ready.
 */
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AiInterfaceGateway {
  @WebSocketServer()
  server: Server;

  private isReady = false;
  private messageQueue: any[] = []; // Store messages until WebSocket is ready
  private readonly logger = new Logger(AiInterfaceGateway.name);

  constructor(
    @Inject(forwardRef(() => AiInterfaceService))
    private readonly aiInterfaceService: AiInterfaceService,
  ) { }

  /**
   * Called after the WebSocket server is initialized.
   * Marks the WebSocket as ready and sends any queued messages.
   */
  afterInit() {
    this.isReady = true;
    this.logger.log('WebSocket Server Initialized');

    // Send any messages that were queued while the WebSocket was not ready
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.sendTranslationResponse(message);
    }
  }

  /**
   * Sends a translation response to a client.
   * If the WebSocket server is not ready, it queues the response.
   *
   * @param response The translation response to be sent.
   */
  sendTranslationResponse(response: any) {
    if (!this.isReady) {
      this.logger.warn('WebSocket not ready, storing response...');
      this.messageQueue.push(response); // Store message for later
      return;
    }

    this.logger.log(`Sending response to client: ${response.clientId}`);
    this.server.to(response.clientId).emit('translationResponse', response);
  }

  /**
   * Handles a 'joinRoom' message, allowing a client to join a specific room.
   *
   * @param client The connected client socket.
   * @param clientId The ID of the client to join the room.
   */
  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, clientId: string) {
    this.logger.log(`Client ${client.id} joined room: ${clientId}`);
    client.join(clientId);
    this.server.to(clientId).emit('joinedRoom', { message: 'connected' });
  }

  /**
   * Handles a 'fetchPage' message to fetch translations for a specific client.
   *
   * @param data The data containing the clientId.
   * @param client The connected client socket.
   */
  @SubscribeMessage('fetchPage')
  async handleFetchPage(@MessageBody() data: { clientId: string }) {
    this.logger.log(`Fetching translations for client: ${data.clientId}`);

    try {
      const translations = await this.aiInterfaceService.getTranslations(
        data.clientId,
      );
      this.server.emit('pageData', translations);
      this.logger.log(
        `Translations sent to all clients for client: ${data.clientId}`,
      );
    } catch (error) {
      this.logger.error('Error fetching translations', error.stack);
    }
  }
}
