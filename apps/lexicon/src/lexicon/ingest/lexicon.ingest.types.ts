export type InteractionMetadata = {
  type: string;
  timestamp?: string;
};

/**
 * Raw NLP event after DTO validation
 * This is a WRITE-SIDE contract
 */
export type NlpCompleteEvent = {
  requestId?: string;
  clientId: string;
  language: string;
  timestamp?: string;
  interaction?: InteractionMetadata;
  sentences: Sentence[];
  meaning?: string;
  statementId?: number;
};

export type Sentence = {
  sentenceId: string;
  text: string;
  tokens: Token[];
};

export type Token = {
  surface: string;
  lemma?: string;
  pos: string;
  morph?: Record<string, any>;
};

/**
 * Internal ingestion-only representation
 * Used AFTER deduplication
 */
export type PreparedToken = {
  surface: string;
  lemma?: string;
  pos: string;
};
