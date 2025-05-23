import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiInterfaceController } from './ai-interface.controller';
import { AiInterfaceService } from './ai-interface.service';
import { Translation, WordBreakdown } from './translation.entity';

@Module({
  imports: [
    ConfigModule, // Import ConfigModule to access environment variables
    ClientsModule.registerAsync([
      {
        name: 'TRANSLATION',
        imports: [ConfigModule], // Ensure ConfigModule is available
        inject: [ConfigService], // Inject ConfigService for accessing environment variables
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: configService.get<string>(
                'KAFKA_CLIENT_ID',
                'translation-connector',
              ),
              brokers: [
                configService.get<string>('KAFKA_BROKER', 'localhost:29092'),
              ],
            },
            producerOnlyMode: false,
            consumer: {
              groupId: configService.get<string>(
                'KAFKA_GROUP_ID',
                'translation-consumer',
              ),
            },
          },
        }),
      },
    ]),
    TypeOrmModule.forFeature([Translation, WordBreakdown]),
  ],
  providers: [AiInterfaceService],
  controllers: [AiInterfaceController],
})
export class AiInterfaceModule { }
