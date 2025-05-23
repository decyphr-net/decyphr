import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { GroqProvider } from 'src/providers/groq.provider';
import { RedisModule } from 'src/utils/redis/redis.module';
import { EnrichmentService } from './enrichment.service';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'ENRICHMENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: configService.get<string>('ENRICHMENT_KAFKA_CLIENT_ID'),
              brokers: [configService.get<string>('KAFKA_BROKER')],
            },
            producerOnlyMode: true,
            consumer: {
              groupId: configService.get<string>('ENRICHMENT_KAFKA_GROUP_ID'),
              allowAutoTopicCreation: true,
              heartbeatInterval: 3000,
              sessionTimeout: 30000,
            },
          },
        }),
      },
    ]),
    RedisModule,
  ],
  providers: [GroqProvider, EnrichmentService],
  controllers: [],
  exports: [EnrichmentService]
})
export class EnrichmentModule { }
