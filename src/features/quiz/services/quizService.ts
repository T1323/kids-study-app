import { QuizQuestion, MatchingPair } from "../types";
import type { IdiomProgress } from "../../sync/services/googleDrive";

const API_BASE =
  import.meta.env.PROD
    ? ""
    : typeof import.meta.env.VITE_API_BASE_URL === "string" &&
      import.meta.env.VITE_API_BASE_URL.trim() !== ""
    ? import.meta.env.VITE_API_BASE_URL.trim().replace(/\/$/, "")
    : "http://localhost:3000";

interface GenerateQuizRequest {
  idioms?: string[]; // Legacy support
  targets?: string[]; // New unified field
  history?: IdiomProgress[];
  selectionMode?: "latest" | "weakest";
  description?: string; // For custom challenge
  type?: 'idiom' | 'english' | 'idiom-matching'; // Default to idiom
  level: "junior" | "senior" | "junior-high" | "university";
  apiKey?: string;
  provider?: string;
  model?: string;
  baseURL?: string;
  questionCount?: 5 | 10;
}

interface PreviousMatchingExample {
  idiom: string;
  sentence: string;
}

interface MatchingHistoryEntry {
  requestKey: string;
  generations: PreviousMatchingExample[][];
}

const MATCHING_HISTORY_STORAGE_KEY = "kids-study.quiz-matching-history.v1";
const MAX_MATCHING_HISTORY_SETTINGS = 20;
const MAX_MATCHING_HISTORY_GENERATIONS = 3;
const MAX_MATCHING_EXAMPLES_PER_GENERATION = 10;
const MAX_MATCHING_EXAMPLE_LENGTH = 300;

function isPreviousMatchingExample(value: unknown): value is PreviousMatchingExample {
  if (!value || typeof value !== "object") return false;
  const example = value as Record<string, unknown>;
  return typeof example.idiom === "string" && typeof example.sentence === "string";
}

function isMatchingHistoryEntry(value: unknown): value is MatchingHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.requestKey === "string" && Array.isArray(entry.generations);
}

function getMatchingRequestKey(req: GenerateQuizRequest): string {
  return JSON.stringify({
    type: req.type,
    level: req.level,
    questionCount: req.questionCount ?? 5,
    selectionMode: req.selectionMode ?? null,
    provider: req.provider?.trim() || null,
    model: req.model?.trim() || null,
    targets: [...new Set((req.targets || req.idioms || []).map((target) => target.trim()).filter(Boolean))].sort(),
    idioms: [...new Set((req.history || []).map((item) => item.idiom.trim()).filter(Boolean))].sort(),
  });
}

function readMatchingHistory(requestKey: string): PreviousMatchingExample[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(MATCHING_HISTORY_STORAGE_KEY);
    if (!stored) return [];
    const entries: unknown = JSON.parse(stored);
    if (!Array.isArray(entries)) return [];

    const matchingEntry = entries.find(
      (entry): entry is MatchingHistoryEntry =>
        isMatchingHistoryEntry(entry) && entry.requestKey === requestKey
    );
    if (!matchingEntry) return [];

    return matchingEntry.generations
      .slice(-MAX_MATCHING_HISTORY_GENERATIONS)
      .flatMap((generation) => Array.isArray(generation) ? generation : [])
      .filter(isPreviousMatchingExample)
      .slice(-MAX_MATCHING_HISTORY_GENERATIONS * MAX_MATCHING_EXAMPLES_PER_GENERATION)
      .map(({ idiom, sentence }) => ({
        idiom: idiom.trim().slice(0, MAX_MATCHING_EXAMPLE_LENGTH),
        sentence: sentence.trim().slice(0, MAX_MATCHING_EXAMPLE_LENGTH),
      }));
  } catch (error) {
    console.warn("無法讀取先前的配對題目紀錄：", error);
    return [];
  }
}

function saveMatchingHistory(requestKey: string, questions: unknown): void {
  if (typeof window === "undefined" || !Array.isArray(questions)) return;

  const examples = questions
    .slice(0, MAX_MATCHING_EXAMPLES_PER_GENERATION)
    .filter(isPreviousMatchingExample)
    .map(({ idiom, sentence }) => ({
      idiom: idiom.trim().slice(0, MAX_MATCHING_EXAMPLE_LENGTH),
      sentence: sentence.trim().slice(0, MAX_MATCHING_EXAMPLE_LENGTH),
    }))
    .filter((example) => example.idiom && example.sentence);
  if (examples.length === 0) return;

  try {
    const stored = window.localStorage.getItem(MATCHING_HISTORY_STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    const entries: MatchingHistoryEntry[] = Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is MatchingHistoryEntry => isMatchingHistoryEntry(entry)
        )
      : [];
    const existing = entries.find((entry) => entry.requestKey === requestKey);
    const generations = [...(existing?.generations || []), examples]
      .slice(-MAX_MATCHING_HISTORY_GENERATIONS);
    const nextEntries = [
      ...entries.filter((entry) => entry.requestKey !== requestKey),
      { requestKey, generations },
    ].slice(-MAX_MATCHING_HISTORY_SETTINGS);

    window.localStorage.setItem(MATCHING_HISTORY_STORAGE_KEY, JSON.stringify(nextEntries));
  } catch (error) {
    console.warn("無法儲存配對題目紀錄：", error);
  }
}

export async function generateQuiz(req: GenerateQuizRequest): Promise<QuizQuestion[] | MatchingPair[]> {
  const body: Record<string, unknown> = {
    targets: req.targets || req.idioms,
    history: req.history,
    selectionMode: req.selectionMode,
    description: req.description,
    type: req.type || 'idiom',
    level: req.level,
    questionCount: req.questionCount,
  };

  const matchingRequestKey = req.type === "idiom-matching" ? getMatchingRequestKey(req) : null;
  const previousExamples = matchingRequestKey ? readMatchingHistory(matchingRequestKey) : [];
  if (previousExamples.length > 0) body.previousExamples = previousExamples;

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
    const responseText = await res.text().catch(() => "");
    let errorBody: { error?: string } = {};
    try {
      errorBody = responseText ? JSON.parse(responseText) : {};
    } catch {
      // Some platform errors return an empty or non-JSON response body.
    }
    throw new Error(
      errorBody.error || `測驗生成失敗（${res.status}），服務暫時無法回應，請稍後再試。`
    );
  }

  const data = await res.json();
  
  if (matchingRequestKey) saveMatchingHistory(matchingRequestKey, data.questions);

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
