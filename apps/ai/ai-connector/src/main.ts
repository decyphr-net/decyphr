import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: [process.env.KAFKA_BROKER || 'localhost:29092'],
        },
        consumer: {
          groupId: process.env.KAFKA_GROUP_ID || 'ai-consumer',
        },
      },
    },
  );

  await app.listen();
}

bootstrap();
