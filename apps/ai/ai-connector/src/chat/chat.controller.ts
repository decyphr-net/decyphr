import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { KafkaMessage } from 'kafkajs';
import { GroqProvider } from '../providers/groq.provider';
import { ChatService } from './chat.service';

@Controller()
export class ChatAiConsumer {
  constructor(
    private readonly groq: GroqProvider,
    @Inject() private readonly chatService: ChatService,
  ) { }

  @MessagePattern('chat.user-message')
  async handleUserMessage(@Payload() message: KafkaMessage) {
    const { clientId, message: userMessage } = JSON.parse(
      message.value.toString(),
    );

    // Step 1: Translate input
    const translatedInput = await this.groq.translateAndTrack(
      clientId,
      userMessage,
    );

    // Step 2: Get AI response
    const aiResponse = await this.groq.getAiResponse(translatedInput);

    // Step 3: Translate response
    const translatedOutput = await this.groq.translateAndTrack(
      clientId,
      aiResponse,
    );

    // Step 4: Emit to Kafka (to both lexicon and chat)
    await this.groq.emitToKafka(translatedOutput, clientId);
  }
}
