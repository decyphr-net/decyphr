export interface PhrasebookInteraction {
  type: string;
  timestamp?: number;
}

export interface PhrasebookChanges {
  text?: string;
  translation?: string;
  pronunciation?: string;
  notes?: string;
}

export class UpdatePhraseDto {
  text?: string;
  translation?: string;
  pronunciation?: string;
  notes?: string;
  autoTranslate?: boolean;
}
