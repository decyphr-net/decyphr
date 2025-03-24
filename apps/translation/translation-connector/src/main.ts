import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Load environment variables
  const KAFKA_BROKER = configService.get<string>('KAFKA_BROKER', 'kafka:9092');
  const KAFKA_GROUP_ID = configService.get<string>(
    'KAFKA_GROUP_ID',
    'translation-consumer',
  );
  const PORT = configService.get<number>('PORT', 3009);
  const HOST = configService.get<string>('HOST', '0.0.0.0');

  // Start Kafka microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [KAFKA_BROKER],
      },
      consumer: {
        groupId: KAFKA_GROUP_ID,
      },
    },
  });

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    methods: configService.get<string>('CORS_METHODS', 'GET,POST'),
    allowedHeaders: configService.get<string>(
      'CORS_HEADERS',
      'Content-Type,Authorization',
    ),
    credentials: configService.get<boolean>('CORS_CREDENTIALS', true),
  });

  await app.startAllMicroservices();
  app.useWebSocketAdapter(new IoAdapter(app));
  await app.listen(PORT, HOST);
}
bootstrap();
