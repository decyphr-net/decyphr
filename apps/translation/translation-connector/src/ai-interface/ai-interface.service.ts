import { Injectable, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaveTranslationResult } from './dto/save-translation-result.dto';
import { SaveTranslationDto } from './dto/save-translation.dto';
import { Translation } from './translation.entity';

/**
 * Service responsible for handling translations, saving them to the database,
 * and interacting with the AiInterfaceGateway for real-time communication.
 */
@Injectable()
export class AiInterfaceService {
  private readonly logger = new Logger(AiInterfaceService.name);

  constructor(
    @InjectRepository(Translation)
    private readonly translationRepository: Repository<Translation>,
  ) { }

  /**
   * Saves a translation to the database.
   *
   * @param data The translation data to be saved.
   * @returns A plain object representation of the saved translation.
   */
  async saveTranslation(
    data: SaveTranslationDto,
  ): Promise<SaveTranslationResult> {
    this.logger.log(`Saving translation for client: ${data.clientId}`);

    const translation = this.translationRepository.create({
      clientId: data.clientId,
      originalText: data.originalText,
      targetLanguage: data.targetLanguage,
      translated: data.translated,
    });

    const savedTranslation = await this.translationRepository.save(translation);

    return {
      id: savedTranslation.id,
      clientId: savedTranslation.clientId,
      originalText: savedTranslation.originalText,
      targetLanguage: savedTranslation.targetLanguage,
      translated: savedTranslation.translated,
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
  }
}
