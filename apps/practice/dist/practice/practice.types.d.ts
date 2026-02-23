export declare const EXERCISE_TYPES: readonly ["typed_translation", "sentence_builder", "cloze"];
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
