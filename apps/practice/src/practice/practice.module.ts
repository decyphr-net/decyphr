import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaMessagingModule } from '@decyphr/messaging';
import { PracticeAttempt, PracticeProfile } from './practice.entity';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PracticeProfile, PracticeAttempt]),
    KafkaMessagingModule.register({
      client: {
        brokers: [process.env.KAFKA_BROKERS || 'kafka:9092'],
      },
      consumer: {
        groupId: process.env.KAFKA_GROUP_ID || 'practice-producer-group',
      },
    }) as any,
  ],
  controllers: [PracticeController],
  providers: [PracticeService],
})
export class PracticeModule {}
