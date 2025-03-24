import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { AiInterfaceGateway } from './ai-interface.gateway';
import { AiInterfaceService } from './ai-interface.service';

jest.mock('./ai-interface.service');
jest.mock('@nestjs/common');

describe('AiInterfaceGateway', () => {
  let gateway: AiInterfaceGateway;
  let service: AiInterfaceService;
  let server: Server;
  let client: Socket;
  let logger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiInterfaceGateway, AiInterfaceService, Logger],
    }).compile();

    gateway = module.get<AiInterfaceGateway>(AiInterfaceGateway);
    service = module.get<AiInterfaceService>(AiInterfaceService);
    logger = module.get<Logger>(Logger);

    // Mocking Socket and Server
    server = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    } as unknown as Server;
    client = { id: 'client123', join: jest.fn() } as unknown as Socket;
    gateway.server = server;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('afterInit', () => {
    it('should initialize the WebSocket server and send queued messages', () => {
      gateway['isReady'] = false;
      gateway['messageQueue'] = [{ clientId: 'client123' }];

      gateway.afterInit();

      expect(gateway['isReady']).toBe(true);
      expect(gateway['messageQueue'].length).toBe(0);
      expect(logger.log).toHaveBeenCalledWith('WebSocket Server Initialized');
    });
  });

  describe('sendTranslationResponse', () => {
    it('should send translation response when WebSocket is ready', () => {
      gateway['isReady'] = true;
      const response = { clientId: 'client123', translatedText: 'Hello' };

      gateway.sendTranslationResponse(response);

      expect(server.to).toHaveBeenCalledWith('client123');
      expect(server.emit).toHaveBeenCalledWith('translationResponse', response);
    });

    it('should queue translation response when WebSocket is not ready', () => {
      gateway['isReady'] = false;
      const response = { clientId: 'client123', translatedText: 'Hello' };

      gateway.sendTranslationResponse(response);

      expect(gateway['messageQueue'].length).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(
        'WebSocket not ready, storing response...',
      );
    });
  });

  describe('handleJoinRoom', () => {
    it('should allow client to join a room', () => {
      gateway.handleJoinRoom(client, 'client123');
      expect(client.join).toHaveBeenCalledWith('client123');
      expect(server.to).toHaveBeenCalledWith('client123');
      expect(server.emit).toHaveBeenCalledWith('joinedRoom', {
        message: 'connected',
      });
    });
  });

  describe('handleFetchPage', () => {
    it('should fetch translations for a client and emit the page data', async () => {
      const translations = ['Hello', 'Hola'];
      service.getTranslations = jest.fn().mockResolvedValue(translations);

      await gateway.handleFetchPage({ clientId: 'client123' });

      expect(service.getTranslations).toHaveBeenCalledWith('client123');
      expect(server.emit).toHaveBeenCalledWith('pageData', translations);
    });

    it('should log an error if fetching translations fails', async () => {
      service.getTranslations = jest.fn().mockRejectedValue(new Error('Error'));

      await gateway.handleFetchPage({ clientId: 'client123' });

      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching translations',
        expect.any(String),
      );
    });
  });
});
