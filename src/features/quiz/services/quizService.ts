import { QuizQuestion } from "../types";

const API_BASE =
  typeof import.meta.env.VITE_API_BASE_URL === "string" &&
  import.meta.env.VITE_API_BASE_URL.trim() !== ""
    ? import.meta.env.VITE_API_BASE_URL.trim().replace(/\/$/, "")
    : import.meta.env.PROD
    ? ""
    : "http://localhost:3000";

interface GenerateQuizRequest {
  idioms: string[];
  level: "junior" | "senior";
  apiKey?: string;
  provider?: string;
  model?: string;
  baseURL?: string;
}

export async function generateQuiz(req: GenerateQuizRequest): Promise<QuizQuestion[]> {
  const body: Record<string, unknown> = {
    idioms: req.idioms,
    level: req.level,
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
  return data.questions;
}

/**
 * Mock function for testing without backend
 */
export async function generateQuizMock(req: GenerateQuizRequest): Promise<QuizQuestion[]> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  // Return some dummy questions based on input idioms
  return req.idioms.map((idiom, index) => ({
    id: `mock-${index}`,
    target: idiom,
    question: `這是一個關於${idiom}的測試題目。句子裡的_____是指什麼？`,
    options: [idiom, "亂七八糟", "莫名其妙", "不知所云"].sort(() => Math.random() - 0.5),
    answer: idiom,
    explanation: `因為這是測試，所以答案就是${idiom}。`,
  }));
}
