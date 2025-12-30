import { Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { AiInterfaceController } from './ai-interface.controller';
import { AiInterfaceGateway } from './ai-interface.gateway';
import { AiInterfaceService } from './ai-interface.service';

jest.mock('./ai-interface.gateway');
jest.mock('./ai-interface.service');
jest.mock('@nestjs/microservices');

describe('AiInterfaceController', () => {
  let controller: AiInterfaceController;
  let service: AiInterfaceService;
  let gateway: AiInterfaceGateway;
  let client: ClientKafka;
  let logger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiInterfaceController],
      providers: [
        AiInterfaceService,
        AiInterfaceGateway,
        {
          provide: 'TRANSLATION',
          useValue: {
            connect: jest.fn(),
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AiInterfaceController>(AiInterfaceController);
    service = module.get<AiInterfaceService>(AiInterfaceService);
    gateway = module.get<AiInterfaceGateway>(AiInterfaceGateway);
    client = module.get<ClientKafka>('TRANSLATION');
    logger = new Logger(AiInterfaceController.name);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to Kafka client', async () => {
      client.connect = jest.fn().mockResolvedValue(undefined);
      await controller.onModuleInit();
      expect(client.connect).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith('Kafka Client Connected');
    });

    it('should log error if Kafka connection fails', async () => {
      const error = new Error('Kafka connection failed');
      client.connect = jest.fn().mockRejectedValue(error);
      await controller.onModuleInit();
      expect(logger.error).toHaveBeenCalledWith(
        'Kafka Client Connection Failed',
        error.stack,
      );
    });
  });

  describe('handleTranslationResponse', () => {
    it('should handle translation response and send via WebSocket', async () => {
      const response = {
        clientId: 'client123',
        statement: 'Hello, world!',
        translationResponse: {
          translated: 'Hola, mundo!',
        },
      };

      service.saveTranslation = jest.fn().mockResolvedValue(response);
      gateway['isReady'] = true;
      await controller.handleTranslationResponse(response);
      expect(service.saveTranslation).toHaveBeenCalled();
      expect(gateway.sendTranslationResponse).toHaveBeenCalled();
    });

    it('should delay sending response if WebSocket is not ready', async () => {
      const response = {
        clientId: 'client123',
        statement: 'Hello, world!',
        translationResponse: {
          translated: 'Hola, mundo!',
        },
      };

      service.saveTranslation = jest.fn().mockResolvedValue(response);
      gateway['isReady'] = false;
      await controller.handleTranslationResponse(response);
      expect(gateway.sendTranslationResponse).toHaveBeenCalled();
    });
  });

  describe('translateText', () => {
    it('should emit translation request to Kafka', async () => {
      const translationRequest = {
        sourceLanguage: 'en',
        targetLanguage: 'es',
        text: 'Hello, world!',
        clientId: 'client123',
      };

      await controller.translateText(translationRequest);
      expect(client.emit).toHaveBeenCalledWith(
        'ai.translation.request',
        translationRequest,
      );
    });
  });
});
