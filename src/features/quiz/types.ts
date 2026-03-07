export interface QuizQuestion {
  id: string;
  target: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface MatchingPair {
  id: string;
  idiom: string;
  sentence: string;
  explanation?: string;
}

export interface QuizResult {
  questionId: string;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer?: string;
  explanation?: string;
}

export type QuizMode = "latest" | "weakest";
export type QuizType = "multiple-choice" | "matching";
