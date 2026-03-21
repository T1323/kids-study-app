import { API_BASE } from "../../idiom-search/services/idiomService";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface WritingChatResponse {
  content: string;
  debug?: {
    rawResponse: string;
  };
}

export interface WritingCorrection {
  original: string;
  corrected: string;
  errorSpan: string;
  correctedSpan: string;
  reason: string;
}

export interface WritingGradingResult {
  overallComment: string;
  specificAdvice?: string;
  corrections: WritingCorrection[];
}

export interface WritingGradeResponse {
  data: WritingGradingResult;
  debug?: any;
}

export const chatWithWritingAI = async (
  history: ChatMessage[],
  level: string,
  modelSettings: any
): Promise<WritingChatResponse> => {
  const response = await fetch(`${API_BASE}/api/writing/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      history,
      level,
      options: modelSettings,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to chat with writing AI");
  }

  return response.json();
};

export const gradeWriting = async (
  content: string,
  materials: string[],
  level: string,
  modelSettings: any
): Promise<WritingGradeResponse> => {
  const response = await fetch(`${API_BASE}/api/writing/grade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      materials,
      level,
      options: modelSettings,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to grade writing");
  }

  return response.json();
};
