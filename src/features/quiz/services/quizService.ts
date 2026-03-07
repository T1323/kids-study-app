import { QuizQuestion, MatchingPair } from "../types";

const API_BASE =
  typeof import.meta.env.VITE_API_BASE_URL === "string" &&
  import.meta.env.VITE_API_BASE_URL.trim() !== ""
    ? import.meta.env.VITE_API_BASE_URL.trim().replace(/\/$/, "")
    : import.meta.env.PROD
    ? ""
    : "http://localhost:3000";

interface GenerateQuizRequest {
  idioms?: string[]; // Legacy support
  targets?: string[]; // New unified field
  description?: string; // For custom challenge
  type?: 'idiom' | 'english' | 'idiom-matching'; // Default to idiom
  level: "junior" | "senior" | "junior-high" | "university";
  apiKey?: string;
  provider?: string;
  model?: string;
  baseURL?: string;
  questionCount?: 5 | 10;
}

export async function generateQuiz(req: GenerateQuizRequest): Promise<QuizQuestion[] | MatchingPair[]> {
  const body: Record<string, unknown> = {
    targets: req.targets || req.idioms,
    description: req.description,
    type: req.type || 'idiom',
    level: req.level,
    questionCount: req.questionCount,
  };

  if (req.apiKey?.trim()) {
    body.apiKey = req.apiKey.trim();
    if (req.provider?.trim()) body.provider = req.provider.trim();
    if (req.model?.trim()) body.model = req.model.trim();
    if (req.baseURL?.trim()) body.baseURL = req.baseURL.trim();
  }

  const res = await fetch(`${API_BASE}/api/quiz/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      (errorBody as { error?: string })?.error || `測驗生成失敗（${res.status}）`
    );
  }

  const data = await res.json();
  
  if (data.debug) {
    console.group("LLM Debug Info (Quiz)");
    console.log("Prompt:", data.debug.prompt);
    console.log("Raw Response:", data.debug.rawResponse);
    console.groupEnd();
  }

  return data.questions;
}

/**
 * Mock function for testing without backend
 */
export async function generateQuizMock(req: GenerateQuizRequest): Promise<QuizQuestion[]> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  const targets = req.targets || req.idioms || [];
  
  // Return some dummy questions based on input idioms
  return targets.map((target, index) => ({
    id: `mock-${index}`,
    target: target,
    question: `這是一個關於${target}的測試題目。句子裡的_____是指什麼？`,
    options: [target, "Option A", "Option B", "Option C"].sort(() => Math.random() - 0.5),
    answer: target,
    explanation: `因為這是測試，所以答案就是${target}。`,
  }));
}
