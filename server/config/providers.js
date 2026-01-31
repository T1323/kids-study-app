/**
 * 預設模型/服務設定（後端使用）。
 * 前端僅需 id、name、getKeyUrl，可另建常數或由 GET /api/providers 取得。
 */
export const PROVIDERS = {
  google: {
    name: "Google Gemini（免費額度）",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    model: "gemini-2.0-flash",
    getKeyUrl: "https://aistudio.google.com/apikey",
  },
  groq: {
    name: "Groq（免費額度）",
    baseURL: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    getKeyUrl: "https://console.groq.com/keys",
  },
  deepseek: {
    name: "DeepSeek（免費額度）",
    baseURL: "https://api.deepseek.com",
    model: "deepseek-chat",
    getKeyUrl: "https://platform.deepseek.com/api_keys",
  },
  openai: {
    name: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    getKeyUrl: "https://platform.openai.com/api-keys",
  },
  custom: {
    name: "自訂（自行輸入網址與模型）",
    baseURL: null,
    model: null,
    getKeyUrl: null,
  },
};

/**
 * 依 API Key 前綴推測可能的 provider（僅供前端預選，不保證正確）。
 */
export function detectProviderFromApiKey(key) {
  const k = String(key || "").trim();
  if (k.startsWith("AIza")) return "google";
  if (k.startsWith("gsk_")) return "groq";
  if (k.startsWith("sk-ant-")) return "openai"; // Anthropic 格式不同，此處當 OpenAI 需使用者自訂
  if (k.startsWith("sk-")) return "openai"; // OpenAI 或 DeepSeek 皆為 sk-，預設 openai
  return null;
}
