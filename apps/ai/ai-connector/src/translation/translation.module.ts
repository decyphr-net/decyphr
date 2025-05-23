import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EnrichmentModule } from 'src/enrichment/enrichment.module';
import { GroqProvider } from 'src/providers/groq.provider';
import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'TRANSLATION',
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
            },
          },
        }),
      },
    ]),
    EnrichmentModule,
  ],
  providers: [GroqProvider, TranslationService],
  controllers: [TranslationController],
  exports: [TranslationService],
})
export class TranslationModule { }
