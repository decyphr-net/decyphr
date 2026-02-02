import { Module } from "@nestjs/common";
import { KafkaProducer } from "./kafka.producer";
import { TranslationProducer } from "./translation-producer";

@Module({
  providers: [KafkaProducer, TranslationProducer],
  exports: [KafkaProducer, TranslationProducer],
})
export class KafkaMessagingModule {}