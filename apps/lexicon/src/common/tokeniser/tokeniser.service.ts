import { Injectable } from '@nestjs/common';
import { NLPAdapter } from './adapters/nlp.adapter';
import { TokenWithMeta } from './adapters/types';

@Injectable()
export class TokeniserService {
  constructor(
    private readonly adapter: NLPAdapter,
  ) { }

  normalise(text: string): string {
    return this.adapter.normalise(text);
  }

  tokenise(text: string, language: string = 'und'): Promise<TokenWithMeta[]> {
    return this.adapter.tokenise(text, language);
  }
}
