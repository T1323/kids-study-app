import { generateQuizWithLLM, generateCustomQuizWithLLM } from "../services/llmService.js";
import { detectProviderFromApiKey } from "../config/providers.js";

/**
 * POST /api/quiz/generate
 * Body: { idioms?: string[], targets?: string[], description?: string, type?: string, level: string, apiKey?, provider?, model?, baseURL? }
 */
export async function postGenerateQuiz(req, res) {
  try {
    // Determine quiz type and targets
    let body = req.body || {};
    // Handle case where body might be a string (if body-parser failed or other middleware issue)
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error("Failed to parse body string:", e);
      }
    }

    const { idioms, targets, description, type, level, apiKey, provider, model, baseURL } = body;
    const quizType = type === 'english' ? 'english' : 'idiom';
    
    // Set options
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

    const validLevels = ["junior", "senior", "junior-high", "university"];
    const validLevel = validLevels.includes(level) ? level : "junior";

    // Scenario 1: Custom Challenge (Description based)
    // Ensure description is a non-empty string
    if (description && typeof description === 'string' && description.trim().length > 0) {
        const questions = await generateCustomQuizWithLLM(description.trim(), validLevel, options);
        res.json({ questions });
        return;
    }

    // Scenario 2: List based (Idioms or Targets)
    const targetList = targets || idioms; // Legacy support for 'idioms'

    // Fix: If we fall through to here, it means description was invalid or missing.
    // If targetList is also missing, we return the error.
    if (!Array.isArray(targetList) || targetList.length === 0) {
      // Improve error message for debugging
      console.log("[Quiz] Invalid request body:", JSON.stringify(req.body));
      res.status(400).json({ error: "請提供列表 (targets array) 或描述 (description)。" });
      return;
    }

    // 限制一次最多處理 10 個項目，避免 LLM 負載過重或 timeout
    const limitedTargets = targetList.slice(0, 10);
    
    const questions = await generateQuizWithLLM(limitedTargets, validLevel, options, quizType);
    res.json({ questions });

  } catch (err) {
    console.error("[POST /api/quiz/generate]", err);
    const message = err.message || "測驗生成失敗，請稍後再試。";
    res.status(500).json({ error: message });
  }
}
