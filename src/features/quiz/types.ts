export interface QuizQuestion {
  id: string;
  target: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface QuizResult {
  questionId: string;
  isCorrect: boolean;
  userAnswer: string;
}

export type QuizMode = "latest" | "weakest";
