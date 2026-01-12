export interface CreateStatementInput {
  text: string;
  language: string;
  clientId: string;
  source: string;
  meaning?: string | null;
  timestamp?: Date;
}
