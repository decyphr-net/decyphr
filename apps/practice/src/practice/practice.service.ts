import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { StatementEventProducer } from '@decyphr/messaging';
import {
  DuePracticeQueryDto,
  PracticeMistakesQueryDto,
  PracticeHistoryQueryDto,
  PracticeProgressQueryDto,
  ResetProfilesDto,
  SubmitPracticeAttemptDto,
} from './practice.dto';
import { PracticeAttempt, PracticeProfile } from './practice.entity';
import { EXERCISE_TYPES, ExerciseType, PhrasebookPhrase, PhraseToken } from './practice.types';

type BuiltExercise = {
  phraseId: number;
  exerciseType: ExerciseType;
  prompt: string;
  expectedAnswer: string;
  tokens?: string[];
  maskedIndex?: number;
};

type PracticeQueueItem = {
  exerciseId: string;
  phraseId: number;
  exerciseType: ExerciseType;
  prompt: string;
  tokens?: string[];
  maskedIndex?: number;
  dueAt: Date;
  expectedAnswer: string;
  lastIncorrectAt?: Date;
};

type ResolvedPhrasePair = {
  english: string;
  irish: string;
};

@Injectable()
export class PracticeService {
  private readonly logger = new Logger(PracticeService.name);
  private readonly phrasebookUrl = process.env.PHRASEBOOK_SERVICE_URL || 'http://phrasebook:3011';

  constructor(
    @InjectRepository(PracticeProfile)
    private readonly profileRepo: Repository<PracticeProfile>,
    @InjectRepository(PracticeAttempt)
    private readonly attemptRepo: Repository<PracticeAttempt>,
    private readonly statementEventProducer: StatementEventProducer,
  ) {}

  private nextMidnight(daysFromNow: number): Date {
    const due = new Date();
    due.setHours(0, 0, 0, 0);
    due.setDate(due.getDate() + daysFromNow);
    return due;
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  private async parseResponse(res: Response) {
    if (!res.ok) {
      const body = await res.text();
      throw new BadRequestException(`Phrasebook service error (${res.status}): ${body}`);
    }
    return res.json();
  }

  private async fetchWithRetry(url: string, init?: RequestInit, retries = 2) {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fetch(url, init);
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }

  private async getPhrases(clientId: string): Promise<PhrasebookPhrase[]> {
    const url = `${this.phrasebookUrl}/phrases?clientId=${encodeURIComponent(clientId)}`;
    let res: Response;

    try {
      res = await this.fetchWithRetry(url, undefined, 2);
    } catch (error) {
      this.logger.error(
        `Failed to reach phrasebook service for clientId=${clientId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new ServiceUnavailableException(
        'Phrasebook service is temporarily unavailable',
      );
    }

    const data = (await this.parseResponse(res)) as PhrasebookPhrase[];

    return data.filter(
      (phrase) =>
        typeof phrase?.id === 'number' &&
        typeof phrase?.text === 'string' &&
        phrase.text.trim().length > 0 &&
        typeof phrase?.translation === 'string' &&
        phrase.translation.trim().length > 0,
    );
  }

  private sortedTokens(phrase: PhrasebookPhrase): string[] {
    if (Array.isArray(phrase.tokens) && phrase.tokens.length > 0) {
      return [...phrase.tokens]
        .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
        .map((token) => token.surface)
        .filter((value) => typeof value === 'string' && value.trim().length > 0);
    }

    return phrase.text
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  private cleanText(input: string): string {
    return input.replace(/^\s*\[Translated\]\s*/i, '').trim();
  }

  private isLikelyIrish(text: string): boolean {
    const value = text.toLowerCase();
    if (/[áéíóú]/i.test(text)) return true;
    return /\b(tá|ní|bhí|agus|conas|cad|go|raibh|maith|an|ar|le|mé|tú|sí|sé|siad)\b/.test(
      value,
    );
  }

  private isLikelyEnglish(text: string): boolean {
    const value = text.toLowerCase();
    return /\b(the|is|are|what|how|where|why|hello|good|morning|i|you|we|they|can|do|does)\b/.test(
      value,
    );
  }

  private isStrongIrishPhrase(text: string): boolean {
    const tokens = text
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (tokens.length === 0) return false;

    const englishLikeCount = tokens.filter((token) => this.isLikelyEnglish(token)).length;
    const irishLikeCount = tokens.filter((token) => this.isLikelyIrish(token)).length;

    if (englishLikeCount / tokens.length >= 0.5) return false;
    if (irishLikeCount > 0) return true;

    // Accept unknown-but-not-English tokens (e.g. Irish words without fada markers).
    return englishLikeCount === 0;
  }

  private resolvePhrasePair(phrase: PhrasebookPhrase): ResolvedPhrasePair | null {
    const text = this.cleanText(phrase.text || '');
    const translation = this.cleanText(phrase.translation || '');

    if (!text || !translation) return null;
    if (this.normalizeAscii(text) === this.normalizeAscii(translation)) return null;

    const textLooksIrish = this.isLikelyIrish(text);
    const translationLooksIrish = this.isLikelyIrish(translation);
    const textLooksEnglish = this.isLikelyEnglish(text);
    const translationLooksEnglish = this.isLikelyEnglish(translation);

    if (textLooksEnglish && !translationLooksEnglish) {
      return { english: text, irish: translation };
    }

    if (translationLooksEnglish && !textLooksEnglish) {
      return { english: translation, irish: text };
    }

    if (textLooksIrish && !translationLooksIrish) {
      return { english: translation, irish: text };
    }

    if (translationLooksIrish && !textLooksIrish) {
      return { english: text, irish: translation };
    }

    // Ambiguous pair: skip rather than risking English->English or reversed exercises.
    return null;
  }

  private sortedIrishTokens(phrase: PhrasebookPhrase, irishText: string): string[] {
    const sourceText = this.cleanText(phrase.text || '');
    if (this.normalizeAscii(sourceText) === this.normalizeAscii(irishText)) {
      return this.sortedTokens(phrase);
    }

    return irishText
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  private isPunctuationToken(value: string): boolean {
    return /^[\p{P}\p{S}]+$/u.test(value);
  }

  private hasEnglishToken(tokens: string[]): boolean {
    return tokens.some((token) => this.isLikelyEnglish(token));
  }

  private pickMaskToken(tokens: PhraseToken[], fallbackTokens: string[]) {
    const priority = tokens
      .filter((token) =>
        typeof token.surface === 'string' &&
        token.surface.trim().length > 0 &&
        typeof token.pos === 'string' &&
        /(NOUN|VERB|ADJ)/i.test(token.pos),
      )
      .sort((a, b) => b.surface.length - a.surface.length)[0];

    if (priority) {
      const sorted = [...tokens].sort((a, b) => a.position - b.position);
      const index = sorted.findIndex((value) => value.surface === priority.surface);
      if (index >= 0) {
        return { index, token: priority.surface };
      }
    }

    let longestIndex = 0;
    for (let i = 1; i < fallbackTokens.length; i += 1) {
      if (fallbackTokens[i].length > fallbackTokens[longestIndex].length) {
        longestIndex = i;
      }
    }

    return { index: longestIndex, token: fallbackTokens[longestIndex] || '' };
  }

  private shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  private buildExercise(phrase: PhrasebookPhrase, exerciseType: ExerciseType): BuiltExercise {
    const resolved = this.resolvePhrasePair(phrase);
    if (!resolved) {
      throw new NotFoundException(`Phrase ${phrase.id} does not have a valid EN/GA pair`);
    }

    const prompt = resolved.english;
    const canonicalText = resolved.irish;

    if (exerciseType === 'cloze' && !this.isStrongIrishPhrase(canonicalText)) {
      throw new NotFoundException(
        `Phrase ${phrase.id} cannot be used for cloze (answer side is not confidently Irish)`,
      );
    }

    if (exerciseType === 'typed_translation') {
      return {
        phraseId: phrase.id,
        exerciseType,
        prompt,
        expectedAnswer: canonicalText,
      };
    }

    if (exerciseType === 'sentence_builder') {
      let orderedTokens = this.sortedIrishTokens(phrase, resolved.irish);
      if (orderedTokens.length === 0) {
        orderedTokens = resolved.irish
          .split(/\s+/)
          .map((value) => value.trim())
          .filter(Boolean);
      }

      if (orderedTokens.length === 0) {
        throw new NotFoundException(
          `Phrase ${phrase.id} cannot be used for sentence builder (no tokens)`,
        );
      }

      const shuffledTokens = this.shuffle(orderedTokens)
        .map((value) => value.trim())
        .filter(Boolean);

      if (shuffledTokens.length === 0) {
        throw new NotFoundException(
          `Phrase ${phrase.id} cannot be used for sentence builder (empty shuffled tokens)`,
        );
      }

      return {
        phraseId: phrase.id,
        exerciseType,
        prompt,
        expectedAnswer: orderedTokens.join(' '),
        tokens: shuffledTokens,
      };
    }

    const sorted = this.sortedIrishTokens(phrase, resolved.irish);
    if (sorted.length < 2) {
      throw new NotFoundException(
        `Phrase ${phrase.id} cannot be used for cloze (insufficient context)`,
      );
    }

    const lexicalTokens = sorted
      .map((token) => token.trim())
      .filter((token) => token.length > 0 && !this.isPunctuationToken(token));

    if (lexicalTokens.length < 2) {
      throw new NotFoundException(
        `Phrase ${phrase.id} cannot be used for cloze (insufficient lexical context)`,
      );
    }

    // Cloze only makes sense when the context shown to users is Irish, not mixed with English.
    if (this.hasEnglishToken(lexicalTokens)) {
      throw new NotFoundException(
        `Phrase ${phrase.id} cannot be used for cloze (mixed-language context)`,
      );
    }

    const selected = this.pickMaskToken(phrase.tokens || [], sorted);
    const promptTokens = [...sorted];
    promptTokens[selected.index] = '____';

    const visibleContextTokens = promptTokens
      .filter((token) => token !== '____')
      .map((token) => token.trim())
      .filter((token) => token.length > 0 && !this.isPunctuationToken(token));

    if (visibleContextTokens.length < 1) {
      throw new NotFoundException(
        `Phrase ${phrase.id} cannot be used for cloze (no visible context)`,
      );
    }

    return {
      phraseId: phrase.id,
      exerciseType,
      prompt: promptTokens.join(' '),
      expectedAnswer: selected.token,
      tokens: sorted,
      maskedIndex: selected.index,
    };
  }

  private normalize(input: string): string {
    return input
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeAscii(input: string): string {
    return this.normalize(input).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array.from({ length: b.length + 1 }, (_, index) => [index]);

    for (let i = 0; i <= a.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let i = 1; i <= b.length; i += 1) {
      for (let j = 1; j <= a.length; j += 1) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  private typoThreshold(length: number): number {
    if (length <= 5) return 0;
    if (length <= 12) return 1;
    return 2;
  }

  private canonicalEnglishToken(token: string) {
    if (token === 'hi' || token === 'hey' || token === 'hiya') return 'hello';
    if (token === 'thanks') return 'thank';
    if (token === 'ok' || token === 'okay') return 'ok';
    return token;
  }

  private englishStructureToken(token: string) {
    const mapped = this.canonicalEnglishToken(token);

    // Keep this list intentionally small: loosen structure, not meaning.
    if (
      mapped === 'a' ||
      mapped === 'an' ||
      mapped === 'the' ||
      mapped === 'of' ||
      mapped === 'for' ||
      mapped === 'to' ||
      mapped === 'please'
    ) {
      return '';
    }

    if (mapped.endsWith('ies') && mapped.length > 4) {
      return `${mapped.slice(0, -3)}y`;
    }

    if (mapped.endsWith('s') && mapped.length > 3) {
      return mapped.slice(0, -1);
    }

    return mapped;
  }

  private looseTokenMatch(expected: string, user: string) {
    if (expected === user) return true;

    const maxLength = Math.max(expected.length, user.length);
    if (maxLength <= 4) return false;

    const distance = this.levenshteinDistance(expected, user);
    return distance <= 1;
  }

  private looseEnglishStructureMatch(expected: string, user: string) {
    const expectedTokens = this
      .normalizeAscii(expected)
      .split(/\s+/)
      .map((value) => this.englishStructureToken(value))
      .filter(Boolean);

    const userTokens = this
      .normalizeAscii(user)
      .split(/\s+/)
      .map((value) => this.englishStructureToken(value))
      .filter(Boolean);

    if (expectedTokens.length === 0 || userTokens.length === 0) {
      return false;
    }

    const used = new Set<number>();
    let matches = 0;

    for (const expectedToken of expectedTokens) {
      let foundIndex = -1;
      for (let i = 0; i < userTokens.length; i += 1) {
        if (used.has(i)) continue;
        if (this.looseTokenMatch(expectedToken, userTokens[i])) {
          foundIndex = i;
          break;
        }
      }
      if (foundIndex >= 0) {
        used.add(foundIndex);
        matches += 1;
      }
    }

    if (expectedTokens.length <= 3) {
      return matches === expectedTokens.length;
    }

    const coverage = matches / expectedTokens.length;
    return coverage >= 0.8;
  }

  private scoreTypedOrCloze(expected: string, user: string, exerciseType: ExerciseType) {
    const normalizedExpected = this.normalize(expected);
    const normalizedUser = this.normalize(user);

    if (!normalizedUser) {
      return {
        score: 0,
        isCorrect: false,
        normalizedExpected,
        normalizedUser,
      };
    }

    if (normalizedExpected === normalizedUser) {
      return {
        score: 100,
        isCorrect: true,
        normalizedExpected,
        normalizedUser,
      };
    }

    const expectedAscii = this.normalizeAscii(expected);
    const userAscii = this.normalizeAscii(user);
    if (expectedAscii === userAscii) {
      return {
        score: 100,
        isCorrect: true,
        normalizedExpected,
        normalizedUser,
      };
    }

    const distance = this.levenshteinDistance(expectedAscii, userAscii);
    const threshold = this.typoThreshold(expectedAscii.length);
    if (distance <= threshold) {
      return {
        score: 85,
        isCorrect: true,
        normalizedExpected,
        normalizedUser,
      };
    }

    if (
      exerciseType === 'typed_translation' &&
      this.isLikelyEnglish(expected) &&
      this.looseEnglishStructureMatch(expected, user)
    ) {
      return {
        score: 80,
        isCorrect: true,
        normalizedExpected,
        normalizedUser,
      };
    }

    return {
      score: 0,
      isCorrect: false,
      normalizedExpected,
      normalizedUser,
    };
  }

  private scoreSentenceBuilder(expected: string, tokens: string[]) {
    const expectedTokens = expected
      .split(/\s+/)
      .map((value) => value.trim())
      .filter((value) => value && !this.isPunctuationToken(value))
      .map((value) => this.normalizeAscii(value));

    const userTokens = tokens
      .map((value) => value.trim())
      .filter((value) => value && !this.isPunctuationToken(value))
      .map((value) => this.normalizeAscii(value));

    const isExact =
      expectedTokens.length === userTokens.length &&
      expectedTokens.every((value, index) => value === userTokens[index]);

    return {
      score: isExact ? 100 : 0,
      isCorrect: isExact,
      normalizedExpected: expectedTokens.join(' '),
      normalizedUser: userTokens.join(' '),
    };
  }

  private toGrade(score: number): 'again' | 'good' | 'easy' {
    if (score >= 100) return 'easy';
    if (score >= 85) return 'good';
    return 'again';
  }

  private weaknessScore(profile: Pick<PracticeProfile, 'reviewCount' | 'lapseCount' | 'consecutiveCorrect'>): number {
    const reviewCount = Math.max(0, Number(profile.reviewCount || 0));
    const lapseCount = Math.max(0, Number(profile.lapseCount || 0));
    const streak = Math.max(0, Number(profile.consecutiveCorrect || 0));

    const lapseRatio = (lapseCount + 1) / (reviewCount + 2);
    const streakPenalty = streak > 0 ? 0 : 0.12;
    const raw = lapseRatio + streakPenalty;
    return this.clamp(raw, 0, 1);
  }

  private computeSchedule(profile: PracticeProfile, grade: 'again' | 'good' | 'easy') {
    const previousEase = profile.easeFactor || 2.5;
    const previousInterval = profile.intervalDays || 0;
    const previousStreak = profile.consecutiveCorrect || 0;

    let nextEase = previousEase;
    let nextInterval = previousInterval;
    let nextStreak = previousStreak;
    let lapseIncrement = 0;
    const weakness = this.weaknessScore(profile);

    if (grade === 'again') {
      nextEase = this.clamp(previousEase - 0.2, 1.3, 3.0);
      nextInterval = 0;
      nextStreak = 0;
      lapseIncrement = 1;
    }

    if (grade === 'good') {
      nextEase = this.clamp(previousEase + 0.05, 1.3, 3.0);
      if (previousInterval <= 0) {
        nextInterval = 1;
      } else if (previousInterval === 1) {
        nextInterval = 3;
      } else {
        nextInterval = Math.round(previousInterval * previousEase);
      }
      nextStreak = previousStreak + 1;
    }

    if (grade === 'easy') {
      nextEase = this.clamp(previousEase + 0.15, 1.3, 3.0);
      if (previousInterval <= 0) {
        nextInterval = 3;
      } else {
        nextInterval = Math.round(previousInterval * (previousEase + 0.35));
      }
      nextStreak = previousStreak + 1;
    }

    if (grade === 'good' || grade === 'easy') {
      // Weak profiles need denser repetition even after a correct attempt.
      const dampening = 1 - weakness * 0.5;
      nextInterval = Math.max(1, Math.round(nextInterval * dampening));
    }

    const againDelayMinutes = weakness > 0.6 ? 3 : 5;
    const dueAt =
      grade === 'again'
        ? new Date(Date.now() + againDelayMinutes * 60 * 1000)
        : this.nextMidnight(nextInterval);

    return {
      previousEase,
      previousInterval,
      nextEase,
      nextInterval,
      nextStreak,
      lapseIncrement,
      dueAt,
    };
  }

  private async ensureProfiles(clientId: string, phraseIds: number[], exerciseTypes: ExerciseType[]) {
    if (phraseIds.length === 0 || exerciseTypes.length === 0) return;

    const existing = await this.profileRepo.find({
      where: exerciseTypes.flatMap((exerciseType) =>
        phraseIds.map((phraseId) => ({ clientId, phraseId, exerciseType })),
      ),
    });

    const existingKey = new Set(
      existing.map((profile) => `${profile.clientId}:${profile.phraseId}:${profile.exerciseType}`),
    );

    const toCreate = exerciseTypes.flatMap((exerciseType) =>
      phraseIds
        .filter((phraseId) => !existingKey.has(`${clientId}:${phraseId}:${exerciseType}`))
        .map((phraseId) =>
          this.profileRepo.create({
            clientId,
            phraseId,
            exerciseType,
            easeFactor: 2.5,
            intervalDays: 0,
            consecutiveCorrect: 0,
            reviewCount: 0,
            lapseCount: 0,
            lastReviewedAt: null,
            dueAt: new Date(),
          }),
        ),
    );

    if (toCreate.length > 0) {
      await this.profileRepo.save(toCreate);
    }
  }

  private buildQueueItem(
    phraseById: Map<number, PhrasebookPhrase>,
    profile: Pick<PracticeProfile, 'phraseId' | 'exerciseType' | 'dueAt'>,
    extra?: { dueAt?: Date; lastIncorrectAt?: Date },
  ): PracticeQueueItem | null {
    const phrase = phraseById.get(profile.phraseId);
    if (!phrase) return null;

    let built: BuiltExercise;
    try {
      built = this.buildExercise(phrase, profile.exerciseType as ExerciseType);
    } catch {
      return null;
    }

    const tokens = built.tokens?.map((value) => value.trim()).filter(Boolean);
    if (built.exerciseType === 'sentence_builder' && (!tokens || tokens.length === 0)) {
      return null;
    }

    return {
      exerciseId: `${profile.exerciseType}:${profile.phraseId}`,
      phraseId: profile.phraseId,
      exerciseType: profile.exerciseType,
      prompt: built.prompt,
      tokens,
      maskedIndex: built.maskedIndex,
      dueAt: extra?.dueAt ?? profile.dueAt,
      expectedAnswer: built.expectedAnswer,
      lastIncorrectAt: extra?.lastIncorrectAt,
    };
  }

  private repeatFill(items: PracticeQueueItem[], target: number): PracticeQueueItem[] {
    if (items.length === 0) return items;

    const filled = [...items];
    let cursor = 0;
    while (filled.length < target) {
      const source = filled[cursor % items.length];
      filled.push({
        ...source,
        exerciseId: `${source.exerciseId}:repeat:${filled.length}`,
      });
      cursor += 1;
    }
    return filled;
  }

  async getDue(clientId: string, query: DuePracticeQueryDto) {
    const phrases = await this.getPhrases(clientId);
    const phraseById = new Map(
      phrases
        .filter((phrase) => this.resolvePhrasePair(phrase) !== null)
        .map((phrase) => [phrase.id, phrase]),
    );

    const exerciseTypes = query.exerciseType ? [query.exerciseType] : [...EXERCISE_TYPES];
    await this.ensureProfiles(clientId, [...phraseById.keys()], exerciseTypes);

    const now = new Date();
    const limit = Math.max(1, Math.min(100, Number(query.limit || 15)));

    const qb = this.profileRepo
      .createQueryBuilder('profile')
      .where('profile.clientId = :clientId', { clientId })
      .andWhere('profile.dueAt <= :now', { now })
      .orderBy('profile.dueAt', 'ASC')
      .addOrderBy('profile.id', 'ASC')
      .limit(limit);

    if (query.exerciseType) {
      qb.andWhere('profile.exerciseType = :exerciseType', {
        exerciseType: query.exerciseType,
      });
    }

    let profiles = await qb.getMany();

    if (profiles.length < limit) {
      const missing = limit - profiles.length;
      const selectedIds = new Set(profiles.map((profile) => Number(profile.id)));

      const fallbackQb = this.profileRepo
        .createQueryBuilder('profile')
        .where('profile.clientId = :clientId', { clientId })
        .andWhere('profile.dueAt > :now', { now })
        .orderBy('profile.dueAt', 'ASC')
        .limit(limit * 3);

      if (query.exerciseType) {
        fallbackQb.andWhere('profile.exerciseType = :exerciseType', {
          exerciseType: query.exerciseType,
        });
      }

      const fallback = await fallbackQb.getMany();
      const prioritizedFallback = fallback
        .filter((profile) => !selectedIds.has(Number(profile.id)))
        .sort((a, b) => {
          const weaknessDiff = this.weaknessScore(b) - this.weaknessScore(a);
          if (weaknessDiff !== 0) return weaknessDiff;
          return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
        })
        .slice(0, missing);

      profiles = [...profiles, ...prioritizedFallback];
    }

    profiles = profiles.sort((a, b) => {
      const weaknessDiff = this.weaknessScore(b) - this.weaknessScore(a);
      if (weaknessDiff !== 0) return weaknessDiff;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });

    let exercises = profiles
      .map((profile) => this.buildQueueItem(phraseById, profile))
      .filter(Boolean) as PracticeQueueItem[];

    if (exercises.length < limit) {
      const existingKeys = new Set(
        exercises.map((item) => `${item.exerciseType}:${item.phraseId}`),
      );
      const allProfiles = await this.profileRepo.find({
        where: query.exerciseType
          ? [{ clientId, exerciseType: query.exerciseType }]
          : EXERCISE_TYPES.map((exerciseType) => ({ clientId, exerciseType })),
        order: { dueAt: 'ASC' },
      });

      for (const profile of allProfiles) {
        if (exercises.length >= limit) break;
        const key = `${profile.exerciseType}:${profile.phraseId}`;
        if (existingKeys.has(key)) continue;
        const candidate = this.buildQueueItem(phraseById, profile);
        if (!candidate) continue;
        exercises.push(candidate);
        existingKeys.add(key);
      }
    }

    exercises = this.repeatFill(exercises, limit);

    return {
      totalDue: exercises.length,
      items: exercises,
    };
  }

  async submitAttempt(clientId: string, dto: SubmitPracticeAttemptDto) {
    const phrases = await this.getPhrases(clientId);
    const phrase = phrases.find((item) => item.id === dto.phraseId);
    if (!phrase) {
      throw new NotFoundException(`Phrase ${dto.phraseId} not found for client`);
    }

    const built = this.buildExercise(phrase, dto.exerciseType);
    const resolved = this.resolvePhrasePair(phrase);

    let gradeResult;
    let userAnswer = dto.userAnswer || null;

    if (dto.exerciseType === 'sentence_builder') {
      const tokens = dto.userTokens || [];
      userAnswer = tokens.join(' ');
      gradeResult = this.scoreSentenceBuilder(built.expectedAnswer, tokens);
    } else {
      gradeResult = this.scoreTypedOrCloze(
        built.expectedAnswer,
        dto.userAnswer || '',
        dto.exerciseType,
      );
    }

    let profile = await this.profileRepo.findOne({
      where: {
        clientId,
        phraseId: dto.phraseId,
        exerciseType: dto.exerciseType,
      },
    });

    if (!profile) {
      profile = this.profileRepo.create({
        clientId,
        phraseId: dto.phraseId,
        exerciseType: dto.exerciseType,
        easeFactor: 2.5,
        intervalDays: 0,
        consecutiveCorrect: 0,
        reviewCount: 0,
        lapseCount: 0,
        lastReviewedAt: null,
        dueAt: new Date(),
      });
      profile = await this.profileRepo.save(profile);
    }

    const schedule = this.computeSchedule(profile, this.toGrade(gradeResult.score));

    profile.easeFactor = schedule.nextEase;
    profile.intervalDays = schedule.nextInterval;
    profile.consecutiveCorrect = schedule.nextStreak;
    profile.reviewCount = (profile.reviewCount || 0) + 1;
    profile.lapseCount = (profile.lapseCount || 0) + schedule.lapseIncrement;
    profile.lastReviewedAt = new Date();
    profile.dueAt = schedule.dueAt;
    profile = await this.profileRepo.save(profile);

    const attempt = this.attemptRepo.create({
      clientId,
      phraseId: dto.phraseId,
      exerciseType: dto.exerciseType,
      profileId: profile.id,
      promptText: built.prompt,
      expectedAnswer: built.expectedAnswer,
      userAnswer,
      isCorrect: gradeResult.isCorrect,
      score: String(gradeResult.score),
      latencyMs: dto.latencyMs ?? null,
      hintsUsed: dto.hintsUsed ?? 0,
      metadataJson: {
        normalizedExpected: gradeResult.normalizedExpected,
        normalizedUser: gradeResult.normalizedUser,
      },
    });

    const savedAttempt = await this.attemptRepo.save(attempt);

    try {
      const lexiconText = resolved?.irish || this.cleanText(phrase.text);
      const lexiconTranslation = resolved?.english || this.cleanText(phrase.translation || '');
      await this.statementEventProducer.emitStatementEvent({
        requestId: randomUUID(),
        clientId,
        changes: {
          text: lexiconText,
          translation: lexiconTranslation || undefined,
        },
        interaction: {
          type: gradeResult.isCorrect
            ? 'flashcard_guess_correct'
            : 'flashcard_guess_incorrect',
          timestamp: Date.now(),
        },
        type: 'statement_updated',
        autoTranslate: false,
        timestamp: Date.now(),
        language: 'ga',
      });
    } catch (error) {
      this.logger.warn(
        `Failed to emit practice lexicon event for clientId=${clientId}, phraseId=${dto.phraseId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return {
      attemptId: savedAttempt.id,
      isCorrect: gradeResult.isCorrect,
      score: gradeResult.score,
      normalizedExpected: gradeResult.normalizedExpected,
      nextDueAt: profile.dueAt,
      profileStats: {
        easeFactor: profile.easeFactor,
        intervalDays: profile.intervalDays,
        reviewCount: profile.reviewCount,
        lapseCount: profile.lapseCount,
        consecutiveCorrect: profile.consecutiveCorrect,
      },
    };
  }

  async getRecentMistakes(clientId: string, query: PracticeMistakesQueryDto) {
    const limit = Math.max(1, Math.min(100, Number(query.limit || 15)));
    const phrases = await this.getPhrases(clientId);
    const phraseById = new Map(
      phrases
        .filter((phrase) => this.resolvePhrasePair(phrase) !== null)
        .map((phrase) => [phrase.id, phrase]),
    );

    const attempts = await this.attemptRepo.find({
      where: { clientId, isCorrect: false },
      order: { createdAt: 'DESC' },
      take: limit * 8,
    });

    const unique = new Map<string, PracticeAttempt>();
    for (const attempt of attempts) {
      const key = `${attempt.exerciseType}:${attempt.phraseId}`;
      if (!unique.has(key)) {
        unique.set(key, attempt);
      }
      if (unique.size >= limit) break;
    }

    let items = [...unique.values()]
      .map((attempt) =>
        this.buildQueueItem(
          phraseById,
          {
            phraseId: attempt.phraseId,
            exerciseType: attempt.exerciseType as ExerciseType,
            dueAt: attempt.createdAt,
          },
          { dueAt: attempt.createdAt, lastIncorrectAt: attempt.createdAt },
        ),
      )
      .filter(Boolean) as PracticeQueueItem[];

    if (items.length < limit) {
      const fallback = await this.getDue(clientId, { ...query, limit });
      const existingKeys = new Set(
        items.map((item) => `${item.exerciseType}:${item.phraseId}`),
      );
      for (const item of fallback.items as PracticeQueueItem[]) {
        if (items.length >= limit) break;
        const key = `${item.exerciseType}:${item.phraseId}`;
        if (existingKeys.has(key)) continue;
        items.push(item);
        existingKeys.add(key);
      }
    }

    items = this.repeatFill(items, limit);

    return {
      total: items.length,
      items,
    };
  }

  private parseDate(input?: string): Date | undefined {
    if (!input) return undefined;
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    return parsed;
  }

  async getProgress(clientId: string, query: PracticeProgressQueryDto) {
    const from = this.parseDate(query.from);
    const to = this.parseDate(query.to);

    const qb = this.attemptRepo
      .createQueryBuilder('attempt')
      .where('attempt.clientId = :clientId', { clientId });

    if (from) qb.andWhere('attempt.createdAt >= :from', { from });
    if (to) qb.andWhere('attempt.createdAt <= :to', { to });

    const attempts = await qb.getMany();

    const byType = EXERCISE_TYPES.reduce<Record<string, { attempts: number; correct: number }>>(
      (acc, type) => {
        acc[type] = { attempts: 0, correct: 0 };
        return acc;
      },
      {},
    );

    for (const attempt of attempts) {
      byType[attempt.exerciseType].attempts += 1;
      if (attempt.isCorrect) byType[attempt.exerciseType].correct += 1;
    }

    const totalAttempts = attempts.length;
    const totalCorrect = attempts.filter((attempt) => attempt.isCorrect).length;

    const dueCount = await this.profileRepo
      .createQueryBuilder('profile')
      .where('profile.clientId = :clientId', { clientId })
      .andWhere('profile.dueAt <= :now', { now: new Date() })
      .getCount();

    return {
      totalAttempts,
      totalCorrect,
      accuracy: totalAttempts > 0 ? Number(((totalCorrect / totalAttempts) * 100).toFixed(2)) : 0,
      dueCount,
      byType: Object.fromEntries(
        Object.entries(byType).map(([type, stats]) => {
          const accuracy =
            stats.attempts > 0 ? Number(((stats.correct / stats.attempts) * 100).toFixed(2)) : 0;
          return [type, { ...stats, accuracy }];
        }),
      ),
    };
  }

  async getHistory(clientId: string, query: PracticeHistoryQueryDto) {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize || 20)));

    const [items, total] = await this.attemptRepo.findAndCount({
      where: { clientId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      total,
      page,
      pageSize,
      data: items,
    };
  }

  async resetProfiles(clientId: string, dto: ResetProfilesDto) {
    if (dto.phraseId != null) {
      await this.profileRepo.delete({ clientId, phraseId: Number(dto.phraseId) });
    } else {
      await this.profileRepo.delete({ clientId });
    }

    return {
      ok: true,
      phraseId: dto.phraseId ?? null,
    };
  }
}
