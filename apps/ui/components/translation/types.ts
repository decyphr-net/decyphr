export type Token = {
  correctedWord: string;
  translatedWord: string;
  pos_tag: string;
  lemma: string;
  level: string;
};

export type Translation = {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  breakdown: Token[];
  createdAt?: string;
};
