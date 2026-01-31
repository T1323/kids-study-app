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
  /** 使用者輸入的 API Key（選填，有填則與 provider 一併送後端） */
  apiKey?: string;
  /** 預設服務 id：google | groq | deepseek | openai | custom */
  provider?: string;
  /** 自訂時使用 */
  model?: string;
  baseURL?: string;
}

