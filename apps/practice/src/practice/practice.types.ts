export const EXERCISE_TYPES = ['typed_translation', 'sentence_builder', 'cloze'] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export type PhraseToken = {
  position: number;
  surface: string;
  lemma?: string;
  pos?: string;
};

export type PhrasebookPhrase = {
  id: number;
  text: string;
  translation?: string | null;
  tokens?: PhraseToken[];
};
