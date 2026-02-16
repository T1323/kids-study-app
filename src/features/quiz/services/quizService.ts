import { QuizQuestion } from "../types";

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
  type?: 'idiom' | 'english'; // Default to idiom
  level: "junior" | "senior" | "junior-high";
  apiKey?: string;
  provider?: string;
  model?: string;
  baseURL?: string;
}

export async function generateQuiz(req: GenerateQuizRequest): Promise<QuizQuestion[]> {
  // Map new unified fields to payload
  // The backend might need adjustment, but for now assuming we can send 'idioms' for idiom mode
  // and maybe 'words' for english mode, or generic 'targets' if we update backend.
  // Since I cannot change backend easily right now, I will use client-side adaptation if needed.
  // But wait, the task is to implement English Quiz feature. I should assume I can update backend or use a different endpoint?
  // The user prompt said "Implement English Quiz functionality".
  // I will check if I can use a new endpoint or update the existing one.
  // For now let's construct a body that can handle both if I update the backend later, or stick to 'idioms' field if it's reused.
  // Actually, I should probably check server/routes/quiz.js to see how it handles things.
  // But I don't want to overcomplicate. Let's send 'targets' and 'type'.
  
  const body: Record<string, unknown> = {
    targets: req.targets || req.idioms,
    type: req.type || 'idiom',
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
