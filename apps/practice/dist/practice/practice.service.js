"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PracticeService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const practice_entity_1 = require("./practice.entity");
const practice_types_1 = require("./practice.types");
let PracticeService = class PracticeService {
    constructor(profileRepo, attemptRepo) {
        this.profileRepo = profileRepo;
        this.attemptRepo = attemptRepo;
        this.phrasebookUrl = process.env.PHRASEBOOK_SERVICE_URL || 'http://phrasebook:3011';
    }
    nextMidnight(daysFromNow) {
        const due = new Date();
        due.setHours(0, 0, 0, 0);
        due.setDate(due.getDate() + daysFromNow);
        return due;
    }
    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
    async parseResponse(res) {
        if (!res.ok) {
            const body = await res.text();
            throw new common_1.BadRequestException(`Phrasebook service error (${res.status}): ${body}`);
        }
        return res.json();
    }
    async getPhrases(clientId) {
        const res = await fetch(`${this.phrasebookUrl}/phrases?clientId=${encodeURIComponent(clientId)}`);
        const data = (await this.parseResponse(res));
        return data.filter((phrase) => typeof phrase?.id === 'number' &&
            typeof phrase?.text === 'string' &&
            phrase.text.trim().length > 0 &&
            typeof phrase?.translation === 'string' &&
            phrase.translation.trim().length > 0);
    }
    sortedTokens(phrase) {
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
    isPunctuationToken(value) {
        return /^[\p{P}\p{S}]+$/u.test(value);
    }
    pickMaskToken(tokens, fallbackTokens) {
        const priority = tokens
            .filter((token) => typeof token.surface === 'string' &&
            token.surface.trim().length > 0 &&
            typeof token.pos === 'string' &&
            /(NOUN|VERB|ADJ)/i.test(token.pos))
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
    shuffle(items) {
        const copy = [...items];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }
    buildExercise(phrase, exerciseType) {
        const prompt = phrase.translation?.trim() || '';
        const canonicalText = phrase.text.trim();
        if (exerciseType === 'typed_translation') {
            return {
                phraseId: phrase.id,
                exerciseType,
                prompt,
                expectedAnswer: canonicalText,
            };
        }
        if (exerciseType === 'sentence_builder') {
            const orderedTokens = this.sortedTokens(phrase);
            return {
                phraseId: phrase.id,
                exerciseType,
                prompt,
                expectedAnswer: orderedTokens.join(' '),
                tokens: this.shuffle(orderedTokens),
            };
        }
        const sorted = this.sortedTokens(phrase);
        if (sorted.length === 0) {
            throw new common_1.NotFoundException(`Phrase ${phrase.id} has no tokens for cloze`);
        }
        const selected = this.pickMaskToken(phrase.tokens || [], sorted);
        const promptTokens = [...sorted];
        promptTokens[selected.index] = '____';
        return {
            phraseId: phrase.id,
            exerciseType,
            prompt: promptTokens.join(' '),
            expectedAnswer: selected.token,
            tokens: sorted,
            maskedIndex: selected.index,
        };
    }
    normalize(input) {
        return input
            .toLowerCase()
            .replace(/[’']/g, "'")
            .replace(/[\u2013\u2014]/g, '-')
            .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    normalizeAscii(input) {
        return this.normalize(input).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    levenshteinDistance(a, b) {
        const matrix = Array.from({ length: b.length + 1 }, (_, index) => [index]);
        for (let i = 0; i <= a.length; i += 1) {
            matrix[0][i] = i;
        }
        for (let i = 1; i <= b.length; i += 1) {
            for (let j = 1; j <= a.length; j += 1) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[b.length][a.length];
    }
    typoThreshold(length) {
        if (length <= 5)
            return 0;
        if (length <= 12)
            return 1;
        return 2;
    }
    scoreTypedOrCloze(expected, user) {
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
        return {
            score: 0,
            isCorrect: false,
            normalizedExpected,
            normalizedUser,
        };
    }
    scoreSentenceBuilder(expected, tokens) {
        const expectedTokens = expected
            .split(/\s+/)
            .map((value) => value.trim())
            .filter((value) => value && !this.isPunctuationToken(value))
            .map((value) => this.normalizeAscii(value));
        const userTokens = tokens
            .map((value) => value.trim())
            .filter((value) => value && !this.isPunctuationToken(value))
            .map((value) => this.normalizeAscii(value));
        const isExact = expectedTokens.length === userTokens.length &&
            expectedTokens.every((value, index) => value === userTokens[index]);
        return {
            score: isExact ? 100 : 0,
            isCorrect: isExact,
            normalizedExpected: expectedTokens.join(' '),
            normalizedUser: userTokens.join(' '),
        };
    }
    toGrade(score) {
        if (score >= 100)
            return 'easy';
        if (score >= 85)
            return 'good';
        return 'again';
    }
    computeSchedule(profile, grade) {
        const previousEase = profile.easeFactor || 2.5;
        const previousInterval = profile.intervalDays || 0;
        const previousStreak = profile.consecutiveCorrect || 0;
        let nextEase = previousEase;
        let nextInterval = previousInterval;
        let nextStreak = previousStreak;
        let lapseIncrement = 0;
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
            }
            else if (previousInterval === 1) {
                nextInterval = 3;
            }
            else {
                nextInterval = Math.round(previousInterval * previousEase);
            }
            nextStreak = previousStreak + 1;
        }
        if (grade === 'easy') {
            nextEase = this.clamp(previousEase + 0.15, 1.3, 3.0);
            if (previousInterval <= 0) {
                nextInterval = 3;
            }
            else {
                nextInterval = Math.round(previousInterval * (previousEase + 0.35));
            }
            nextStreak = previousStreak + 1;
        }
        const dueAt = grade === 'again' ? new Date(Date.now() + 5 * 60 * 1000) : this.nextMidnight(nextInterval);
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
    async ensureProfiles(clientId, phraseIds, exerciseTypes) {
        if (phraseIds.length === 0 || exerciseTypes.length === 0)
            return;
        const existing = await this.profileRepo.find({
            where: exerciseTypes.flatMap((exerciseType) => phraseIds.map((phraseId) => ({ clientId, phraseId, exerciseType }))),
        });
        const existingKey = new Set(existing.map((profile) => `${profile.clientId}:${profile.phraseId}:${profile.exerciseType}`));
        const toCreate = exerciseTypes.flatMap((exerciseType) => phraseIds
            .filter((phraseId) => !existingKey.has(`${clientId}:${phraseId}:${exerciseType}`))
            .map((phraseId) => this.profileRepo.create({
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
        })));
        if (toCreate.length > 0) {
            await this.profileRepo.save(toCreate);
        }
    }
    async getDue(clientId, query) {
        const phrases = await this.getPhrases(clientId);
        const phraseById = new Map(phrases.map((phrase) => [phrase.id, phrase]));
        const exerciseTypes = query.exerciseType ? [query.exerciseType] : [...practice_types_1.EXERCISE_TYPES];
        await this.ensureProfiles(clientId, phrases.map((phrase) => phrase.id), exerciseTypes);
        const now = new Date();
        const limit = query.limit ?? 20;
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
        const profiles = await qb.getMany();
        const exercises = profiles
            .map((profile) => {
            const phrase = phraseById.get(profile.phraseId);
            if (!phrase)
                return null;
            const built = this.buildExercise(phrase, profile.exerciseType);
            return {
                exerciseId: `${profile.exerciseType}:${profile.phraseId}`,
                phraseId: profile.phraseId,
                exerciseType: profile.exerciseType,
                prompt: built.prompt,
                tokens: built.tokens,
                maskedIndex: built.maskedIndex,
                dueAt: profile.dueAt,
                expectedAnswer: built.expectedAnswer,
            };
        })
            .filter(Boolean);
        return {
            totalDue: exercises.length,
            items: exercises,
        };
    }
    async submitAttempt(clientId, dto) {
        const phrases = await this.getPhrases(clientId);
        const phrase = phrases.find((item) => item.id === dto.phraseId);
        if (!phrase) {
            throw new common_1.NotFoundException(`Phrase ${dto.phraseId} not found for client`);
        }
        const built = this.buildExercise(phrase, dto.exerciseType);
        let gradeResult;
        let userAnswer = dto.userAnswer || null;
        if (dto.exerciseType === 'sentence_builder') {
            const tokens = dto.userTokens || [];
            userAnswer = tokens.join(' ');
            gradeResult = this.scoreSentenceBuilder(built.expectedAnswer, tokens);
        }
        else {
            gradeResult = this.scoreTypedOrCloze(built.expectedAnswer, dto.userAnswer || '');
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
    parseDate(input) {
        if (!input)
            return undefined;
        const parsed = new Date(input);
        if (Number.isNaN(parsed.getTime())) {
            throw new common_1.BadRequestException('Invalid date');
        }
        return parsed;
    }
    async getProgress(clientId, query) {
        const from = this.parseDate(query.from);
        const to = this.parseDate(query.to);
        const qb = this.attemptRepo
            .createQueryBuilder('attempt')
            .where('attempt.clientId = :clientId', { clientId });
        if (from)
            qb.andWhere('attempt.createdAt >= :from', { from });
        if (to)
            qb.andWhere('attempt.createdAt <= :to', { to });
        const attempts = await qb.getMany();
        const byType = practice_types_1.EXERCISE_TYPES.reduce((acc, type) => {
            acc[type] = { attempts: 0, correct: 0 };
            return acc;
        }, {});
        for (const attempt of attempts) {
            byType[attempt.exerciseType].attempts += 1;
            if (attempt.isCorrect)
                byType[attempt.exerciseType].correct += 1;
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
            byType: Object.fromEntries(Object.entries(byType).map(([type, stats]) => {
                const accuracy = stats.attempts > 0 ? Number(((stats.correct / stats.attempts) * 100).toFixed(2)) : 0;
                return [type, { ...stats, accuracy }];
            })),
        };
    }
    async getHistory(clientId, query) {
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
    async resetProfiles(clientId, dto) {
        if (dto.phraseId != null) {
            await this.profileRepo.delete({ clientId, phraseId: Number(dto.phraseId) });
        }
        else {
            await this.profileRepo.delete({ clientId });
        }
        return {
            ok: true,
            phraseId: dto.phraseId ?? null,
        };
    }
};
exports.PracticeService = PracticeService;
exports.PracticeService = PracticeService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(practice_entity_1.PracticeProfile)),
    __param(1, (0, typeorm_1.InjectRepository)(practice_entity_1.PracticeAttempt)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], PracticeService);
//# sourceMappingURL=practice.service.js.map