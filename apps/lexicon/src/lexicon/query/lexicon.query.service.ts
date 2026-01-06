import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, Word } from 'src/bank/bank.entity';
import { In, Repository } from 'typeorm';
import { RedisProfileService } from '../profile.service';
import { WordSnapshot } from './lexicon.query.types';

@Injectable()
export class LexiconQueryService {
  constructor(
    private readonly profile: RedisProfileService,
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) { }

  async getUserWordSnapshot(
    clientId: string,
    language: string,
  ): Promise<WordSnapshot[]> {

    const user = await this.getOrCreateUser(clientId);

    const raw = await this.profile.getUserTopWords(
      user.clientId,
      language,
      1000,
    );

    if (!raw.length) return [];

    const wordEntities = await this.wordRepository.find({
      where: { id: In(raw.map(r => r.wordId)) },
    });

    const wordMap = new Map(wordEntities.map(w => [w.id, w]));

    const seenMap = await this.profile.getUserWordSeen(
      user.clientId,
      language,
      raw.map(r => r.wordId),
    );

    return raw
      .map(r => {
        const word = wordMap.get(r.wordId);
        if (!word) return null;

        const seenAt = seenMap.get(r.wordId);

        const daysSinceSeen = seenAt
          ? (Date.now() - seenAt) / (1000 * 60 * 60 * 24)
          : 365; // IMPORTANT: missing = OLD

        const score = this.computeDecayedScore(
          r.score,
          daysSinceSeen,
        );

        return {
          id: word.id,
          word: word.word,
          lemma: word.lemma,
          pos: word.pos,
          language: word.language,
          stats: {
            score: Number(score.toFixed(2)),
            rawScore: r.score,
            lastSeen: seenAt ?? null,
          },
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.stats.score - a!.stats.score) as WordSnapshot[];
  }

  private computeDecayedScore(
    rawScore: number,
    daysSinceSeen: number,
  ): number {
    const strength = Math.log1p(rawScore);
    const lambda = 0.15;

    return rawScore * Math.exp(
      -lambda * daysSinceSeen / strength,
    );
  }

  private async getOrCreateUser(clientId: string) {
    await this.userRepository
      .createQueryBuilder()
      .insert()
      .into(User)
      .values({ clientId })
      .orIgnore()
      .execute();

    return this.userRepository.findOneOrFail({
      where: { clientId },
    });
  }
}

