import { Test, TestingModule } from '@nestjs/testing';
import { Kafka, Producer } from 'kafkajs';
import { KafkaService } from './kafka.service';

jest.mock('kafkajs');

describe('KafkaService', () => {
  let service: KafkaService;
  let producerMock: jest.Mocked<Producer>;

  beforeEach(async () => {
    producerMock = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      send: jest.fn(),
    } as any;

    (Kafka as any).mockImplementation(() => ({
      producer: () => producerMock,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [KafkaService],
    }).compile();

    service = module.get<KafkaService>(KafkaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect the Kafka producer', async () => {
      await service.onModuleInit();
      expect(producerMock.connect).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect the Kafka producer', async () => {
      await service.onModuleDestroy();
      expect(producerMock.disconnect).toHaveBeenCalled();
    });
  });

  describe('emit', () => {
    it('should send a message to the specified topic', async () => {
      const topic = 'test-topic';
      const message = { key: 'value' };

      await service.emit(topic, message);

      expect(producerMock.send).toHaveBeenCalledWith({
        topic,
        messages: [{ value: JSON.stringify(message) }],
      });
    });
  });
});
