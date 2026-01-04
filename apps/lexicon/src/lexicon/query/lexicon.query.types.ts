export type WordStats = {
  total: number;
  weighted: number;
  total7d: number;
  total30d: number;
  weighted7d: number;
  weighted30d: number;
  score: number;
};

export type WordSnapshot = {
  id: string;
  word: string;
  normalised: string;
  tag: string;
  language: string;
  lemma: string;
  stats: WordStats;
};
