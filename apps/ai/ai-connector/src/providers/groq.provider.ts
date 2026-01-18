import { ChatGroq } from '@langchain/groq';
import { Injectable, Logger } from '@nestjs/common';
import { BotDto } from 'src/chat/dtos/bot.dto';
import ChatMessagePayload from 'src/chat/dtos/chat-message.dto';
import { VaultTranslationGuessSchema } from 'src/guess/guess.schema';
import { RedisService } from 'src/utils/redis/redis.service';
import {
  SimpleTranslation,
  SimpleTranslationSchema,
} from '../translation/translation.schema';

type RedisWord = {
  id: string;
  score: number;
  word: string;
};

@Injectable()
export class GroqProvider {
  private readonly logger = new Logger(GroqProvider.name);
  private llm: ChatGroq;

  constructor(private readonly redisService: RedisService) {
    this.llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      modelName: process.env.GROQ_MODEL_NAME,
      temperature: 0,
    });
  }

  private async getUserWordsForChat(userId: string, language: string) {
    const client = this.redisService.client;
    const zsetKey = `user:${userId}:priority:${language}`;

    // Fetch top 30 high-confidence + next 50 medium/low
    const flat = await client.zrevrange(zsetKey, 0, 29, 'WITHSCORES');

    // Convert flat array to { id, score }
    const wordIdsWithScores = [];
    for (let i = 0; i < flat.length; i += 2) {
      wordIdsWithScores.push({
        id: flat[i],
        score: parseFloat(flat[i + 1]),
      });
    }

    // Use pipeline to fetch actual words
    const pipeline = client.pipeline();
    wordIdsWithScores.forEach(item => pipeline.hget('lexicon:words', item.id));
    const wordResults = await pipeline.exec(); // [[err, word], ...]

    // Attach words and filter out missing
    const finalWords = wordIdsWithScores
      .map((item, idx) => {
        const [err, word] = wordResults[idx] ?? [];
        if (err || !word) return null;
        return { ...item, word };
      })
      .filter(Boolean);

    // Sort by score descending
    finalWords.sort((a, b) => b.score - a.score);

    return finalWords;
  }

  async generateResponseFromChat(
    payload: ChatMessagePayload,
    bot: BotDto,
    userId: string
  ): Promise<string> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    const userWords = await this.getUserWordsForChat(userId, payload.language);

    // Split words into strong and weak tiers
    const sortedWords = [...userWords].sort((a, b) => b.score - a.score);
    const strongWords = sortedWords.slice(0, 5).map(w => w.word);
    const weakWords = sortedWords.slice(5, 20).map(w => w.word);

    // Construct word guidance for AI
    let wordsContext = '';
    if (strongWords.length > 0) {
      wordsContext = `Use most of the following words naturally in your response:\nStrong words: ${strongWords.join(
        ', '
      )}`;
      if (weakWords.length > 0) {
        const weakSample = weakWords.sort(() => 0.5 - Math.random()).slice(0, 5);
        wordsContext += `\nWeak words (optional, sprinkle in a few): ${weakSample.join(', ')}`;
      }
    }

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
Only engage in conversation, don't try to teach

NEVER ATTEMPT TO END A CONVERSATION WITH A STUDENT
`.trim();

    if (payload.messages.length === 1) {
      messages.push({ role: 'system', content: botContext });
    }

    for (let i = 0; i < payload.messages.length; i++) {
      const msg = payload.messages[i];
      let content = msg.content;

      if (msg.role === 'user' && i === payload.messages.length - 1 && wordsContext) {
        content += `\nUser priority words:\n${wordsContext}`;
      }

      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content,
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

Return ONLY valid JSON.
Do NOT use markdown.
Do NOT wrap the response in triple backticks.

The JSON must have exactly these keys:
- original
- translated
- sourceLang
- targetLang

IMPORTANT:
- "translated" MUST be a single string.
- If multiple translations exist, choose the most common one.
- Do NOT include alternatives.
- Do NOT use symbols like ||, /, or commas to list options.

Output must begin with { and end with }.
`.trim();

    try {
      const result = await this.llm.invoke(prompt);
      console.log(result)
      const raw = this.extractTextFromAIMessage(result);

      console.log(raw);

      const parsed = this.safeJsonParse(raw);
      return SimpleTranslationSchema.parse(parsed);
    } catch (error) {
      this.logger.error('❌ Failed simple translation', error);
      throw new Error('Simple translation failed');
    }
  }

  private extractTextFromAIMessage(content: any): string {
    if (!content) return '';

    if (typeof content === 'string') return content.trim();

    if (typeof content === 'object' && 'content' in content) {
      if (typeof content.content === 'string') return content.content.trim();

      if (Array.isArray(content.content)) {
        return content.content
          .map(item =>
            typeof item === 'string'
              ? item
              : item?.type === 'text'
                ? item.text
                : ''
          )
          .join('')
          .trim();
      }
    }

    this.logger.warn('⚠️ Unexpected AI response format:', JSON.stringify(content));
    return '';
  }

  private safeJsonParse(raw: string) {
    const cleaned = raw
      .trim()
      // remove ```json or ``` if present
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '');

    return JSON.parse(cleaned);
  }

  async vaultTranslationGuess(payload: {
    targetLanguage: string;
    original: string;
    guess: string;
  }) {
    const PROMPT = `
    You are a language tutor AI.

Your task is to evaluate whether the user understood the meaning of the original sentence.

You MUST:
      - Decide which words from the original text form meaningful semantic units(chunks).
- A chunk may be a single word or multiple words.
- Determine whether the user's translation attempt demonstrates understanding of each chunk.
        - Preserve the exact words from the original text involved in each chunk.
- Allow that the user may skip words they do not understand.
- Do NOT require literal translations.

You MUST return ONLY valid JSON matching the schema below.
Do NOT include markdown, explanations, or extra text.

        Rules:
      - Every word from the original must appear either in "chunks" or "missing_chunks".
- Do NOT invent words for the original text.
- Do NOT invent meanings not implied by the original text.
- If the user conveys the correct meaning using different wording, mark it as understood.
      - If a chunk is understood indirectly, mark confidence as "medium".
      - If partially conveyed, set user_understood = false and explain why.
- Do not wrap the JSON in triple backticks.
- Output must begin with { and end with }.

JSON Schema:
      {
        "overall": "correct | partially_correct | incorrect",
          "chunks": [
            {
              "original": string,
              "meaning": string,
              "user_understood": boolean,
              "confidence": "high | medium | low",
              "reason": string | null
            }
          ],
            "missing_chunks": [
              {
                "original": string,
                "meaning": string,
                "reason": string
              }
            ],
              "notes": string | null
      }

      Language(Language of the original text): ${payload.targetLanguage}

Original text(Text that user will attempt to translate): ${payload.original}

User's translation attempt: ${payload.guess}

Evaluate the user's input.
        `
    try {
      const raw = this.extractTextFromAIMessage(await this.llm.invoke(PROMPT));
      const parsed = this.safeJsonParse(raw);
      return VaultTranslationGuessSchema.parse(parsed);
    } catch (error) {
      this.logger.error('❌ Failed simple translation', error);
      throw new Error('Simple translation failed: invalid AI response');
    }
  }
}
