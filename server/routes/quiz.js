import { generateQuizWithLLM } from "../services/llmService.js";
import { detectProviderFromApiKey } from "../config/providers.js";

/**
 * POST /api/quiz/generate
 * Body: { idioms?: string[], targets?: string[], type?: string, level: string, apiKey?, provider?, model?, baseURL? }
 */
export async function postGenerateQuiz(req, res) {
  try {
    // Determine quiz type and targets
    const { idioms, targets, type, level, apiKey, provider, model, baseURL } = req.body || {};
    const quizType = type === 'english' ? 'english' : 'idiom';
    const targetList = targets || idioms; // Legacy support for 'idioms'

    if (!Array.isArray(targetList) || targetList.length === 0) {
      res.status(400).json({ error: "請提供列表 (targets array)。" });
      return;
    }

    // 限制一次最多處理 10 個項目，避免 LLM 負載過重或 timeout
    const limitedTargets = targetList.slice(0, 10);
    const validLevel = level === "senior" ? "senior" : "junior";

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

    const questions = await generateQuizWithLLM(limitedTargets, validLevel, options, quizType);
    res.json({ questions });

  } catch (err) {
    console.error("[POST /api/quiz/generate]", err);
    const message = err.message || "測驗生成失敗，請稍後再試。";
    res.status(500).json({ error: message });
  }
}
