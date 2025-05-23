import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { KafkaModule } from 'src/utils/kafka/kafka.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [HttpModule, KafkaModule, AuthModule],
  controllers: [ChatController],
  providers: [ChatGateway],
})
export class ChatModule { }
