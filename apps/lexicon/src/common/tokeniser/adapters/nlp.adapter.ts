import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { TokeniserAdapter } from '../tokeniser.adapter';
import { TokenWithMeta } from './types';

@Injectable()
export class NLPAdapter implements TokeniserAdapter {
  private readonly logger = new Logger(NLPAdapter.name);

  constructor(private readonly http: HttpService) { }

  normalise(text: string): string {
    try {
      return text.normalize('NFKC').trim();
    } catch (err) {
      this.logger.warn(`Normalisation error for text="${text}": ${err}`);
      return text?.trim() ?? '';
    }
  }

  async tokenise(
    text: string,
    language: string = 'ga' // default
  ): Promise<TokenWithMeta[]> {
    let response;

    try {
      response = await firstValueFrom(
        this.http.post('http://nlp:8300/process', { text, lang: language })
      );
    } catch (err) {
      this.logger.error(`NLP request failed: ${err?.message ?? err}`);
      return []; // fail-safe
    }

    const data = response?.data;

    if (!data || !Array.isArray(data.result)) {
      this.logger.error(
        `Unexpected NLP response: ${JSON.stringify(data, null, 2)}`
      );
      return [];
    }

    const tokens: TokenWithMeta[] = [];

    for (const t of data.result) {
      if (!t || typeof t.text !== 'string') {
        this.logger.warn(`Malformed token entry: ${JSON.stringify(t)}`);
        continue;
      }

      tokens.push({
        token: t.text,
        lemma: typeof t.lemma === 'string' ? t.lemma : t.text.toLowerCase(),
        pos: typeof t.pos === 'string' ? t.pos : null,
        meta: t, // keeps UPOS, XPOS, feats, etc.
      });
    }

    return tokens;
  }
}
