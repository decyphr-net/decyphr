export type WordStats = {
  total: number;
  weighted: number;
  total7d: number;
  total30d: number;
  weighted7d: number;
  weighted30d: number;
  score: number;
};

export interface WordSnapshot {
  id: number;
  word: string;
  lemma: string;
  normalised?: string;
  pos?: string;

  stats: {
    score: number;
    rawScore: number;
    lastSeenAt?: string;
    updatedAt?: string;
  };
}
