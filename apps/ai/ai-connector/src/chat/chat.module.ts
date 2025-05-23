import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EnrichmentModule } from 'src/enrichment/enrichment.module';
import { GroqProvider } from 'src/providers/groq.provider';
import { RedisModule } from 'src/utils/redis/redis.module';
import { ChatAiConsumer } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'CHAT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: configService.get<string>('KAFKA_CLIENT_ID'),
              brokers: [configService.get<string>('KAFKA_BROKER')],
            },
            producerOnlyMode: true,
            consumer: {
              groupId: configService.get<string>('KAFKA_GROUP_ID'),
              allowAutoTopicCreation: true,
              heartbeatInterval: 3000,
              sessionTimeout: 30000,
            },
          },
        }),
      },
    ]),
    RedisModule,
    EnrichmentModule,
  ],
  controllers: [ChatAiConsumer],
  providers: [GroqProvider, ChatService],
})
export class ChatModule { }
