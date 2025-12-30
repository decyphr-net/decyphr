export interface TokenWithMeta {
  token: string;    // actual text
  lemma?: string;   // base form
  pos?: string;     // part of speech
  [key: string]: any; // any other metadata
}