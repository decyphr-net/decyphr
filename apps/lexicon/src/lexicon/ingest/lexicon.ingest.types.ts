export type InteractionMetadata = {
  type: string;
  timestamp?: string;
};

export type StatementChanges = {
  meaning?: string;
  pronunciation?: string;
  notes?: string;
  translation?: string;
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
  translation?: string;
  pronuciation?: string;
  notes?: string;
  statementId?: number;
  changes?: StatementChanges;
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
