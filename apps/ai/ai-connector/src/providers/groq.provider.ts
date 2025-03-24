import { ChatGroq } from '@langchain/groq';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { TranslationOutputSchema } from '../translation/translation.schema';

@Injectable()
export class GroqProvider {
  private readonly logger = new Logger(GroqProvider.name);
  private llm: ChatGroq;

  constructor() {
    this.llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      modelName: process.env.GROQ_MODEL_NAME,
      temperature: 0,
    });
  }

  /**
   * Processes the input text and generates a structured translation response.
   * @param payload - Object containing text, source language, target language, and optional flags.
   * @returns A structured translation response conforming to `TranslationOutputSchema`.
   * @throws If input validation fails or if an error occurs during processing.
   */
  async getStructuredResponse(payload: {
    text: string;
    sourceLang: string;
    targetLang: string;
    requireResponseFirst?: boolean;
  }): Promise<z.infer<typeof TranslationOutputSchema>> {
    if (!payload.sourceLang || !payload.targetLang) {
      throw new Error(
        '❌ sourceLang or targetLang is missing in GroqProvider!',
      );
    }

    try {
      let processedText = payload.text;

      const typoFixPrompt = `Fix typos and missing accents in the following text: "${processedText}"
- Only correct typos and accents.
- Do not change words or alter meaning.
Corrected text:`;
      const typoFixResult = await this.llm.invoke(typoFixPrompt);
      processedText = this.extractTextFromAIMessage(typoFixResult);

      const translationPrompt = `Translate the following from ${payload.sourceLang} to ${payload.targetLang}:
"${processedText}"
Only provide the translated text.`;
      const translationResult = await this.llm.invoke(translationPrompt);
      const translatedText = this.extractTextFromAIMessage(translationResult);

      const detectLanguagePrompt = `Analyze the following translated text:
"${translatedText}"
- Detect the language (ISO 639-1 format).
- Identify the grammatical tense (past, present, future, etc.).
Return JSON with keys: "detectedLanguage", "tense".`;
      const detectLanguageResult = await this.llm.invoke(detectLanguagePrompt);
      const [{ detectedLanguage, tense }] =
        this.extractJsonFromAIMessage(detectLanguageResult);

      const sentenceAlternativesPrompt = `Provide alternative ways to phrase the following sentence in ${payload.targetLang}:
"${translatedText}"
Return a JSON array of alternative translations, ensuring all remain in ${payload.targetLang}.`;
      const sentenceAlternativesResult = await this.llm.invoke(
        sentenceAlternativesPrompt,
      );
      const [alternatives] = this.extractJsonFromAIMessage(
        sentenceAlternativesResult,
      );

      const wordBreakdownPrompt = `Perform a detailed word breakdown for:
"${translatedText}"
For each word, return JSON with:
- Original word
- Translated word
- Alternative translations
- Part-of-speech (lowercase, full name)
- Lemma (root form of the word)
- Correctness score (0-1)
- CEFR level (A1, A2, B1, etc.)
- Corrected version (if typo was fixed).`;
      const wordBreakdownResult = await this.llm.invoke(wordBreakdownPrompt);
      const [breakdown] = this.extractJsonFromAIMessage(wordBreakdownResult);

      const normalizeBreakdownEntry = (entry: any) => ({
        originalWord: entry.original_word || entry.originalWord || '',
        translatedWord: entry.translated_word || entry.translatedWord || '',
        alternatives:
          entry.alternative_translations || entry.alternatives || [],
        pos_tag: entry.part_of_speech || entry.pos_tag || '',
        lemma: entry.lemma || '',
        correctness: entry.correctness_score || entry.correctness || 0,
        level: entry.cefr_level || entry.level || '',
        correctedWord: entry.corrected_version || entry.correctedWord || '',
      });

      const structuredResponse = {
        detectedLanguage: detectedLanguage || payload.sourceLang,
        translatedText:
          typeof translatedText === 'string'
            ? translatedText
            : JSON.stringify(translatedText),
        alternatives: Array.isArray(alternatives)
          ? alternatives.flat().filter((alt) => typeof alt === 'string')
          : [],
        breakdown: Array.isArray(breakdown)
          ? breakdown.flat().map(normalizeBreakdownEntry)
          : [],
        tense: tense || 'unknown',
      };

      const validationResult =
        TranslationOutputSchema.safeParse(structuredResponse);
      if (!validationResult.success) {
        throw new Error(
          `Schema validation failed: ${JSON.stringify(validationResult.error)}`,
        );
      }

      return validationResult.data;
    } catch (error) {
      this.logger.error('❌ Failed to fetch structured response', error);
      throw new Error('Error generating structured response');
    }
  }

  /**
   * Extracts text content from an AI response.
   * @param content - The AI-generated response object.
   * @returns Extracted text content as a string.
   */
  private extractTextFromAIMessage(content: any): string {
    if (!content) return '';
    if (typeof content === 'string') return content.trim();
    if (typeof content === 'object' && 'content' in content) {
      if (typeof content.content === 'string') return content.content.trim();
      if (Array.isArray(content.content)) {
        return content.content
          .map((item) =>
            typeof item === 'string'
              ? item
              : item?.type === 'text'
                ? item.text
                : '',
          )
          .join(' ')
          .trim();
      }
    }
    this.logger.warn(
      '⚠️ Unexpected AI response format:',
      JSON.stringify(content),
    );
    return '';
  }

  /**
   * Extracts JSON content from an AI response, stripping Markdown formatting if necessary.
   * @param content - The AI-generated response object.
   * @returns Parsed JSON object or an empty array if extraction fails.
   */
  private extractJsonFromAIMessage(content: any): any {
    const rawString = this.extractTextFromAIMessage(content);
    const jsonMatches = [...rawString.matchAll(/```json\s*([\s\S]*?)\s*```/g)];
    const jsonObjects = jsonMatches.map((match) => match[1].trim());

    if (jsonObjects.length === 0) return [];

    try {
      return jsonObjects.map((jsonStr) => JSON.parse(jsonStr));
    } catch (error) {
      this.logger.error('❌ Failed to parse JSON:', jsonObjects);
      return [];
    }
  }
}
