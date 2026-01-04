import { Injectable } from "@nestjs/common";
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, Word } from "src/bank/bank.entity";
import { UserWordStatistics } from "src/interaction/interaction.entity";

@Injectable()
export class LexiconQueryService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Word) private readonly wordRepo: Repository<Word>,
  ) { }

  async getUserWordSnapshot(clientId: string, language: string) {
    const user =
      (await this.userRepo.findOne({ where: { clientId } })) ??
      (await this.userRepo.save(this.userRepo.create({ clientId })));

    const rows = await this.wordRepo
      .createQueryBuilder('w')
      .innerJoin(
        UserWordStatistics,
        'uws',
        'uws.wordId = w.id AND uws.userId = :uid',
        { uid: user.id },
      )
      .where('w.language = :lang', { lang: language })
      .select([
        'w.id AS id',
        'w.word AS word',
        'w.normalised AS normalised',
        'w.tag AS tag',
        'w.language AS language',
        'w.lemma AS lemma',
        'uws.weighted7Days AS weighted7d',
        'uws.weighted30Days AS weighted30d',
        'uws.totalInteractions7Days AS total7d',
        'uws.totalInteractions30Days AS total30d',
        'uws.score AS score',
      ])
      .getRawMany();

    return rows.map(this.mapSnapshotRow);
  }

  private mapSnapshotRow(r: any) {
    return {
      id: r.id,
      word: r.word,
      normalised: r.normalised,
      tag: r.tag,
      language: r.language,
      lemma: r.lemma,
      stats: {
        total: Number(r.total7d) + Number(r.total30d),
        weighted: Number(r.weighted7d) + Number(r.weighted30d),
        total7d: Number(r.total7d),
        total30d: Number(r.total30d),
        weighted7d: Number(r.weighted7d),
        weighted30d: Number(r.weighted30d),
        score: Number(r.score),
      },
    };
  }
}
