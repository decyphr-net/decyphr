import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiInterfaceGateway } from './ai-interface.gateway';
import { SaveTranslationResult } from './dto/save-translation-result.dto';
import { SaveTranslationDto } from './dto/save-translation.dto';
import { Translation, WordBreakdown } from './translation.entity';

/**
 * Service responsible for handling translations, saving them to the database,
 * and interacting with the AiInterfaceGateway for real-time communication.
 */
@Injectable()
export class AiInterfaceService {
  private readonly logger = new Logger(AiInterfaceService.name);

  constructor(
    @Inject(forwardRef(() => AiInterfaceGateway))
    private readonly gateway: AiInterfaceGateway,
    @InjectRepository(Translation)
    private readonly translationRepository: Repository<Translation>,
  ) { }

  /**
   * Saves a translation to the database along with its breakdown.
   *
   * @param data The translation data to be saved.
   * @returns A plain object representation of the saved translation.
   */
  async saveTranslation(
    data: SaveTranslationDto,
  ): Promise<SaveTranslationResult> {
    this.logger.log(`Saving translation for client: ${data.clientId}`);

    // Ensure breakdown is defined and is an array
    const breakdownData = Array.isArray(data.breakdown) ? data.breakdown : [];

    const translation = this.translationRepository.create({
      clientId: data.clientId,
      originalText: data.originalText,
      detectedLanguage: data.detectedLanguage,
      targetLanguage: data.targetLanguage,
      translatedText: data.translatedText,
      alternatives: data.alternatives || [],
    });

    translation.breakdown = breakdownData.map((word) => {
      const wordBreakdown = new WordBreakdown();
      wordBreakdown.originalWord = word.originalWord;
      wordBreakdown.translatedWord = word.translatedWord;
      wordBreakdown.alternatives = JSON.stringify(word.alternatives || []);
      wordBreakdown.pos_tag = word.pos_tag;
      wordBreakdown.lemma = word.lemma;
      wordBreakdown.correctness = word.correctness;
      wordBreakdown.level = word.level;
      wordBreakdown.correctedWord = word.correctedWord;
      wordBreakdown.translation = translation;

      return wordBreakdown;
    });

    const savedTranslation = await this.translationRepository.save(translation);

    return {
      id: savedTranslation.id,
      clientId: savedTranslation.clientId,
      originalText: savedTranslation.originalText,
      detectedLanguage: savedTranslation.detectedLanguage,
      targetLanguage: savedTranslation.targetLanguage,
      translatedText: savedTranslation.translatedText,
      alternatives: savedTranslation.alternatives,
      breakdown: savedTranslation.breakdown.map((wordBreakdown) => ({
        id: wordBreakdown.id,
        originalWord: wordBreakdown.originalWord,
        translatedWord: wordBreakdown.translatedWord,
        alternatives: JSON.parse(wordBreakdown.alternatives || '[]'),
        pos_tag: wordBreakdown.pos_tag,
        lemma: wordBreakdown.lemma,
        correctness: wordBreakdown.correctness,
        level: wordBreakdown.level,
        correctedWord: wordBreakdown.correctedWord,
      })),
      createdAt: savedTranslation.createdAt,
    };
  }

  /**
   * Retrieves translations for a specific client from the database.
   *
   * @param clientId The client ID whose translations are to be retrieved.
   * @returns A list of translations for the specified client.
   */
  async getTranslations(clientId: string) {
    this.logger.log(`Fetching translations for client: ${clientId}`);

    try {
      const translations = await this.translationRepository.find({
        where: { clientId },
        order: { createdAt: 'DESC' },
        relations: ['breakdown'],
      });

      this.logger.log(
        `Translations fetched successfully for client: ${clientId}`,
      );
      return translations;
    } catch (error) {
      this.logger.error(
        `Error fetching translations for client: ${clientId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handles incoming translation responses and sends them via the AiInterfaceGateway.
   *
   * @param response The translation response received from an external service.
   */
  @MessagePattern('ai.translation.response')
  async handleTranslationResponse(response: any) {
    this.logger.log('Received translation response:', response);

    // Ensure the response contains a valid clientId
    if (!response.clientId) {
      this.logger.error('❌ Response does not contain clientId:', response);
      return;
    }

    this.logger.log(
      `Sending translation response to client: ${response.clientId}`,
    );
    this.gateway.sendTranslationResponse(response);
  }
}
