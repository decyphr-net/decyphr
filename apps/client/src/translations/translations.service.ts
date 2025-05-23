import { Injectable, Logger } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { KafkaService } from 'src/utils/kafka/kafka.service';
import { TranslationDto } from './dtos/translation.dto';

@Injectable()
export class TranslationsService {
  private readonly logger = new Logger(TranslationsService.name);

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly authService: AuthService
  ) { }

  async emitTranslationRequest(dto: TranslationDto): Promise<void> {
    const user = await this.authService.findUserByClientId(dto.clientId);
    dto.sourceLanguage = user.languageSettings?.[0]?.targetLanguage;
    dto.targetLanguage = user.languageSettings?.[0]?.firstLanguage;
    await this.kafkaService.emit('translation.translate', dto);
    this.logger.log(`📤 Emitted translation request for clientId=${dto.clientId}`);
  }
}