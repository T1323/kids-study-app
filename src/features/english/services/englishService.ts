import { EnglishWordExplain, EnglishExplainRequest } from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "development" ? "http://localhost:3000" : "");

export async function fetchEnglishExplain(
  payload: EnglishExplainRequest
): Promise<EnglishWordExplain> {
  // If no provider is selected, we can default to backend's choice or throw
  // But usually the backend will handle defaults if fields are missing
  
  const res = await fetch(`${API_BASE_URL}/api/english/explain`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "查詢失敗，請稍後再試");
  }

  const data = await res.json();
  
  if (data.debug) {
    console.group("LLM Debug Info (English)");
    console.log("Prompt:", data.debug.prompt);
    console.log("Raw Response:", data.debug.rawResponse);
    console.groupEnd();
  }

  return data;
}
