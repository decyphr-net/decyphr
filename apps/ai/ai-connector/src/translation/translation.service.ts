import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { GroqProvider } from 'src/providers/groq.provider';
import { TranslationDto } from './translation-request.dto';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  constructor(
    @Inject('TRANSLATION') private readonly translationClient: ClientKafka,
    private readonly groqProvider: GroqProvider,
  ) { }

  async handleTranslation(payload: TranslationDto): Promise<void> {

    const { requestId, clientId, sourceLanguage, targetLanguage, interactions, payload: innerPayload } = payload;

    const translation = await this.groqProvider.translateSimple(
      innerPayload.text,
      sourceLanguage,
      targetLanguage
    );

    const responseMessage = {
      requestId,
      clientId,
      sourceLanguage,
      targetLanguage,
      translated: translation.translated,
      originalText: innerPayload.text,
      interaction: interactions[0]
    };

    await this.translationClient.emit('translation.complete', {
      key: payload.requestId,
      value: responseMessage,
    });

    this.logger.log(
      `📤 Translation COMPLETE emitted for requestId=${payload.requestId}`
    );
  }
}
