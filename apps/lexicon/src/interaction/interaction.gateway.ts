import { forwardRef, Inject, Logger } from '@nestjs/common';
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
import { UserWordStatistics } from '../interaction/interaction.entity';
import { InteractionService } from './interaction.service';

@WebSocketGateway({ cors: true })
export class InteractionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(InteractionGateway.name);

  constructor(
    @Inject(forwardRef(() => InteractionService))
    private readonly interactionService: InteractionService,
  ) { }

  /**
   * Initializes the WebSocket server.
   *
   * @param server The WebSocket server instance.
   */
  afterInit(server: Server) {
    this.logger.log('WebSocket server initialized');
  }

  /**
   * Handles a request to fetch word statistics for a specific client.
   *
   * @param clientId The unique identifier of the client requesting word statistics.
   * @param client The WebSocket client making the request.
   */
  @SubscribeMessage('fetchWordStatistics')
  async handleFetchWordStatistics(
    @MessageBody() clientId: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Fetching word statistics for clientId: ${clientId}`);

    const stats = await this.interactionService.getUserWordStatistics(clientId);
    if (!stats.length) {
      this.logger.warn(`No statistics found for clientId: ${clientId}`);
    }

    client.emit('wordStatisticsUpdate', stats);
  }

  /**
   * Sends updated word statistics to a specific client via WebSocket.
   *
   * @param clientId The unique identifier of the client.
   * @param stats The updated word statistics to send.
   */
  sendWordStatistics(clientId: string, stats?: UserWordStatistics) {
    this.logger.log(`Sending word statistics to clientId: ${clientId}`);

    if (!stats) {
      this.logger.warn(`No statistics available for clientId: ${clientId}`);
      return;
    }

    this.server.to(clientId).emit('wordStatisticsUpdate', stats);
  }

  /**
   * Handles a 'joinRoom' message, allowing a client to join a specific room.
   *
   * @param client The connected client socket.
   * @param clientId The unique identifier of the client joining the room.
   */
  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, clientId: string) {
    this.logger.log(`Client ${client.id} joined room: ${clientId}`);
    client.join(clientId);
    this.server.to(clientId).emit('joinedRoom', { message: 'connected' });
  }

  /**
   * Handles a new WebSocket client connection.
   *
   * @param client The connected WebSocket client.
   */
  handleConnection(client: Socket) {
    const clientId = client.handshake.query.clientId as string;
    this.logger.log(`Client connected: ${clientId}`);
    client.join(clientId);
  }

  /**
   * Handles a WebSocket client disconnection.
   *
   * @param client The disconnected WebSocket client.
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
}
