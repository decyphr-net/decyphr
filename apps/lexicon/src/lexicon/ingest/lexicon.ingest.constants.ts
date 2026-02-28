export const INTERACTION_WEIGHTS: Record<string, number> = {
  lexicon_import: 0.25,
  translate_text: 0.4,
  chat_message: 0.6,
  chat_message_bot: 0.3,
  passive_read: 0.1,
  course_hover_lookup: 0.25,
  course_gloss_lookup: 0.3,
  course_swap_correct: 0.65,
  course_swap_incorrect: -0.2,
  flashcard_guess_correct: 0.8,
  flashcard_guess_incorrect: -0.3,
  default: 0.3,
};

export const POS_MULTIPLIERS: Record<string, number> = {
  CCONJ: 0.1,
  PART: 0.1,
  DET: 0.15,
  PRON: 0.2,
  AUX: 0.2,
  NOUN: 1.0,
  VERB: 1.0,
  ADJ: 1.0,
  ADV: 1.0,
  DEFAULT: 1.0,
};
