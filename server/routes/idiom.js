import { explainIdiomWithLLM } from "../services/llmService.js";
import { PROVIDERS, detectProviderFromApiKey } from "../config/providers.js";

/**
 * GET /api/providers
 * 回傳可選的模型/服務清單（id、name、取得 Key 連結），供前端下拉選單使用。
 */
export function getProviders(req, res) {
  const list = Object.entries(PROVIDERS).map(([id, p]) => ({
    id,
    name: p.name,
    getKeyUrl: p.getKeyUrl || null,
  }));
  res.json(list);
}

/**
 * GET /api/providers/detect?key=xxx
 * 依 API Key 前綴推測可能的 provider，供前端自動選取。
 */
export function detectProvider(req, res) {
  const key = typeof req.query?.key === "string" ? req.query.key.trim() : "";
  const provider = key ? detectProviderFromApiKey(key) : null;
  res.json({ provider });
}

/**
 * POST /api/idiom/explain
 * Body: { idiom, level, apiKey?, provider?, model?, baseURL? }
 * 若提供 apiKey + provider（或 custom 時 baseURL + model），則用該設定呼叫 LLM；否則用後端 env 預設。
 */
export async function postExplain(req, res) {
  try {
    const { idiom, level, apiKey, provider, model, baseURL } = req.body || {};
    const trimmedIdiom = typeof idiom === "string" ? idiom.trim() : "";
    const validLevel = level === "senior" ? "senior" : "junior";

    if (!trimmedIdiom) {
      res.status(400).json({ error: "請提供成語（idiom）。" });
      return;
    }

    const options = {};
    const trimmedApiKey = typeof apiKey === "string" ? apiKey.trim() : "";
    if (trimmedApiKey) {
      options.apiKey = trimmedApiKey;
      let providerId = typeof provider === "string" ? provider.trim() || undefined : undefined;
      if (!providerId) providerId = detectProviderFromApiKey(trimmedApiKey) || undefined;
      if (providerId) options.providerId = providerId;
      if (typeof model === "string" && model.trim()) options.model = model.trim();
      if (typeof baseURL === "string" && baseURL.trim()) options.baseURL = baseURL.trim();
    }

    const result = await explainIdiomWithLLM(trimmedIdiom, validLevel, options);
    res.json(result);
  } catch (err) {
    console.error("[POST /api/idiom/explain]", err);
    const message = err.message || "成語說明生成失敗，請稍後再試。";
    res.status(500).json({ error: message });
  }
}
