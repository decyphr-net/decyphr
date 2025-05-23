import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { EnrichmentService } from 'src/enrichment/enrichment.service';
import { GroqProvider } from 'src/providers/groq.provider';
import { TranslateDto } from './translation-request.dto';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  constructor(
    @Inject('TRANSLATION') private readonly translationClient: ClientKafka,
    private readonly groqProvider: GroqProvider,
    private readonly enrichmentService: EnrichmentService
  ) { }
  async handleTranslation(payload: TranslateDto): Promise<void> {
    if (!payload.sourceLanguage || !payload.targetLanguage) {
      throw new Error(
        '❌ sourceLang or targetLang is missing inside getTranslation()',
      );
    }

    const translation = await this.groqProvider.translateSimple(
      payload.text,
      payload.sourceLanguage,
      payload.targetLanguage
    );

    this.translationClient.emit(
      'ai.translation.response', translation
    );

    this.enrichmentService.enrichText(
      translation.original,
      payload.clientId,
      translation.sourceLang,
      translation.targetLang,
      'manual'
    );

    this.logger.log(
      `📤 Translation response emitted for clientId: ${payload.clientId}`,
    );
  }
}
