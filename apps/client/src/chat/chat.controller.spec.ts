import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { AuthService } from 'src/auth/auth.service';
import { KafkaService } from 'src/utils/kafka/kafka.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';

const mockKafkaService = {
  emit: jest.fn(),
  consume: jest.fn(),
};

const mockAuthService = {
  getClientIdFromSession: jest.fn(),
};

const mockGateway = {
  server: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
};

const mockHttpService = {
  get: jest.fn(),
};

describe('ChatController', () => {
  let controller: ChatController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: KafkaService, useValue: mockKafkaService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ChatGateway, useValue: mockGateway },
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  it('should emit start chat message', async () => {
    mockAuthService.getClientIdFromSession.mockResolvedValue('test-client');

    await controller.startChat({ botId: '1', language: 'ga' }, {
      session: { user: { clientId: 'test-client' } },
    } as any);

    expect(mockKafkaService.emit).toHaveBeenCalledWith('chat.start', {
      type: 'start',
      clientId: 'test-client',
      botId: '1',
      language: 'ga',
    });
  });

  it('should return chat history from microservice', async () => {
    mockAuthService.getClientIdFromSession.mockResolvedValue('client-123');
    const mockHistory = [{ id: 1, botId: 1, language: 'ga', messages: [] }];
    mockHttpService.get.mockReturnValue(of({ data: mockHistory }));

    const result = await controller.getChatHistory({ session: {} } as any);
    expect(result).toEqual(mockHistory);
  });

  it('should handle chat.started messages', async () => {
    const payload = {
      type: 'started',
      clientId: 'test-client',
      chatId: 42,
      greeting: 'Hello!',
    };

    await controller['handleChatStarted']({
      message: { value: Buffer.from(JSON.stringify(payload)) },
    } as any);

    expect(mockGateway.server.to).toHaveBeenCalledWith('test-client');
    expect(mockGateway.server.emit).toHaveBeenCalledWith(
      'chat-started',
      payload,
    );
  });
});
