export type StudyLevel = "junior" | "senior";

export interface IdiomExample {
  zh: string;
}

export interface IdiomExplain {
  idiom: string;
  zhuyin?: string;
  meaning: string;
  usage?: string;
  examples: IdiomExample[];
  tips?: string;
  level: StudyLevel;
}

export interface IdiomExplainRequest {
  idiom: string;
  level: StudyLevel;
  language?: "zh-Hant" | "en";
}

