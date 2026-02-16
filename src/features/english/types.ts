export type StudyLevel = "junior" | "senior" | "junior-high";

export interface EnglishExample {
  en: string; // English sentence
  zh: string; // Chinese translation
}

export interface EnglishWordExplain {
  word: string;          // The queried word
  kk_phonetic?: string;  // KK Phonetic symbol (e.g., [bʊk])
  part_of_speech?: string; // e.g., noun, verb
  meaning_en: string;    // Simple English definition
  meaning_zh: string;    // Chinese definition
  examples: EnglishExample[];
  synonyms?: string[];   // Synonyms
  antonyms?: string[];   // Antonyms
  tips?: string;         // Usage tips or mnemonic
  level: StudyLevel;
}

export interface EnglishHistoryItem extends EnglishWordExplain {
  timestamp: number;
}

export interface EnglishExplainRequest {
  word: string;
  level: StudyLevel;
  apiKey?: string;
  provider?: string;
  model?: string;
  baseURL?: string;
}
