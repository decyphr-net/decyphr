import { Injectable, Logger } from '@nestjs/common';
import { GroqProvider } from 'src/providers/groq.provider';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  constructor(private readonly groqProvider: GroqProvider) { }

  async getTranslation({
    text,
    sourceLang,
    targetLang,
    requireResponseFirst = false,
  }: {
    text: string;
    sourceLang?: string;
    targetLang?: string;
    requireResponseFirst?: boolean;
  }): Promise<unknown> {
    if (!sourceLang || !targetLang) {
      throw new Error(
        '❌ sourceLang or targetLang is missing inside getTranslation()',
      );
    }

    return this.groqProvider.getStructuredResponse({
      text,
      sourceLang,
      targetLang,
      requireResponseFirst,
    });
  }
}
