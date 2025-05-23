import { ChatGroq } from '@langchain/groq';
import { Injectable, Logger } from '@nestjs/common';
import { BotDto } from 'src/chat/dtos/bot.dto';
import ChatMessagePayload from 'src/chat/dtos/chat-message.dto';
import { z } from 'zod';
import { SimpleTranslation, SimpleTranslationSchema, TranslationOutputSchema } from '../translation/translation.schema';

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

  async generateResponseFromChat(payload: ChatMessagePayload, bot: BotDto): Promise<string> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    const botContext = `
You are a helpful language tutor playing the role of a character with the following profile:
- Name: ${bot.name}
- Gender: ${bot.gender}
- Age: ${bot.age}
- Region: ${bot.region}
- City: ${bot.city}
- Background: ${bot.background}
- Occupation: ${bot.occupation}
- Hobbies: ${bot.hobbies}
- Personal Traits: ${bot.personal}
- Language: ${bot.language}

Engage in a natural and friendly conversation in ${bot.language}, while staying in character.
Start at A1 and adjust to the level of the person, but always keep it simple.
Only engage in conversation, don't try to teach`.trim();

    if (payload.messages.length === 1) {
      messages.push({ role: 'system', content: botContext });
    }

    for (const msg of payload.messages) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    try {
      const result = await this.llm.invoke(messages);
      return this.extractTextFromAIMessage(result);
    } catch (error) {
      this.logger.error('❌ Failed to generate chat response', error);
      throw new Error('AI generation failed');
    }
  }

  async translateSimple(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<SimpleTranslation> {
    const prompt = `
  Translate the following from ${sourceLang} to ${targetLang}:
  "${text}"
  Return JSON with the keys: original, translated, sourceLang, targetLang
    `.trim();

    try {
      const result = await this.llm.invoke(prompt);
      const raw = this.extractTextFromAIMessage(result);

      const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || [null, raw];
      const parsed = JSON.parse(jsonMatch[1].trim());

      const validated = SimpleTranslationSchema.parse(parsed);
      return validated;
    } catch (error) {
      this.logger.error('❌ Failed simple translation', error);
      throw new Error('Simple translation failed');
    }
  }

  async getStructuredResponse(payload: {
    text: string;
    sourceLang: string;
    targetLang: string;
    requireResponseFirst?: boolean;
  }): Promise<z.infer<typeof TranslationOutputSchema>> { // TODO: Update this to a more generic name for the return type
    if (!payload.sourceLang || !payload.targetLang) {
      throw new Error('❌ sourceLang or targetLang is missing in GroqProvider!');
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
      const [{ detectedLanguage, tense }] = this.extractJsonFromAIMessage(detectLanguageResult);

      const sentenceAlternativesPrompt = `Provide alternative ways to phrase the following sentence in ${payload.targetLang}:
"${translatedText}"
Return a JSON array of alternative translations, ensuring all remain in ${payload.targetLang}.`;
      const sentenceAlternativesResult = await this.llm.invoke(sentenceAlternativesPrompt);
      const [alternatives] = this.extractJsonFromAIMessage(sentenceAlternativesResult);

      const wordBreakdownPrompt = `You are an expert linguist.
Perform a detailed word-level breakdown for the following sentence:
"${processedText}"

For each word, return a JSON array of objects with the following properties:

[
  {
    "originalWord": "...",
    "translatedWord": "...",
    "alternatives": ["...", "..."],
    "pos_tag": "...",
    "lemma": "...",
    "correctness": 0.0,
    "level": "A1",
    "correctedWord": "..."
  }
]

Ensure all words are included and JSON is valid. Return only the JSON.`;
      const wordBreakdownResult = await this.llm.invoke(wordBreakdownPrompt);
      const [breakdown] = this.extractJsonFromAIMessage(wordBreakdownResult);

      const normalizeBreakdownEntry = (entry: any) => ({
        originalWord: entry.original_word || entry.originalWord || '',
        translatedWord: entry.translated_word || entry.translatedWord || '',
        alternatives: entry.alternative_translations || entry.alternatives || [],
        pos_tag: entry.part_of_speech || entry.pos_tag || '',
        lemma: entry.lemma || '',
        correctness: entry.correctness_score || entry.correctness || 0,
        level: entry.cefr_level || entry.level || '',
        correctedWord: entry.corrected_version || entry.correctedWord || '',
      });

      const structuredResponse = {
        detectedLanguage: detectedLanguage || payload.sourceLang,
        translatedText: typeof translatedText === 'string' ? translatedText : JSON.stringify(translatedText),
        alternatives: Array.isArray(alternatives) ? alternatives.flat().filter((alt) => typeof alt === 'string') : [],
        breakdown: Array.isArray(breakdown) ? breakdown.flat().map(normalizeBreakdownEntry) : [],
        tense: tense || 'unknown',
      };

      const validationResult = TranslationOutputSchema.safeParse(structuredResponse);
      if (!validationResult.success) {
        throw new Error(`Schema validation failed: ${JSON.stringify(validationResult.error)}`);
      }

      return validationResult.data;
    } catch (error) {
      this.logger.error('❌ Failed to fetch structured response', error);
      throw new Error('Error generating structured response');
    }
  }

  private extractTextFromAIMessage(content: any): string {
    if (!content) return '';
    if (typeof content === 'string') return content.trim();
    if (typeof content === 'object' && 'content' in content) {
      if (typeof content.content === 'string') return content.content.trim();
      if (Array.isArray(content.content)) {
        return content.content
          .map((item) => typeof item === 'string' ? item : item?.type === 'text' ? item.text : '')
          .join(' ')
          .trim();
      }
    }
    this.logger.warn('⚠️ Unexpected AI response format:', JSON.stringify(content));
    return '';
  }

  private extractJsonFromAIMessage(content: any): any {
    const rawString = this.extractTextFromAIMessage(content);

    const jsonBlockMatch = rawString.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      try {
        return [JSON.parse(jsonBlockMatch[1].trim())];
      } catch (error) {
        this.logger.error('❌ Failed to parse JSON block:', jsonBlockMatch[1]);
        return [];
      }
    }

    // Fallback to trying the whole response as JSON
    try {
      return [JSON.parse(rawString)];
    } catch (error) {
      this.logger.error('❌ Failed to parse fallback JSON:', rawString);
      return [];
    }
  }
}
