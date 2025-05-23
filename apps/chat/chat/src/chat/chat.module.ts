import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { Chat, Message } from './chat.entity';
import { ChatService } from './chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, Message]),
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
            producerOnlyMode: false,
            consumer: {
              groupId: configService.get<string>('KAFKA_GROUP_ID'),
            },
          },
        }),
      },
    ]),
  ],
  providers: [ChatService],
  controllers: [ChatController],
})
export class ChatModule { }
