import { generateQuizWithLLM, generateCustomQuizWithLLM } from "../services/llmService.js";
import { detectProviderFromApiKey } from "../config/providers.js";

/**
 * POST /api/quiz/generate
 * Body: { idioms?: string[], targets?: string[], history?: object[], selectionMode?: string, description?: string, type?: string, level: string, apiKey?, provider?, model?, baseURL? }
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

    const { idioms, targets, history, selectionMode, description, type, level, apiKey, provider, model, baseURL, questionCount } = body;
    
    const targetList = targets || idioms; // Legacy support for 'idioms'
    const hasHistory = Array.isArray(history) && history.length > 0;
    const normalizedHistory = hasHistory
      ? history
          .filter((item) => item && typeof item.idiom === "string" && item.idiom.trim())
          .slice(0, 200)
          .map((item) => ({
            idiom: item.idiom.trim(),
            queryTime: Number(item.queryTime) || 0,
            proficiency: Math.max(0, Math.min(100, Number(item.proficiency) || 0)),
            lastTestTime: Number(item.lastTestTime) || 0,
            queryCount: Math.max(0, Number(item.queryCount) || 0),
          }))
      : undefined;

    let quizType = 'idiom';
    if (type === 'english') quizType = 'english';
    else if (type === 'idiom-matching') quizType = 'idiom-matching';
    
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

    // Determine question count (default to 5 if not provided or invalid)
    const validQuestionCount = (questionCount === 5 || questionCount === 10) ? questionCount : 5;
    console.log(`[Quiz Generate] count requested: ${questionCount}, valid: ${validQuestionCount}, targetList len: ${targetList?.length}, history len: ${normalizedHistory?.length || 0}`);

    // Allow any level string to pass through (for custom levels or new predefined levels)
    // Default to "junior" if not provided or empty
    const validLevel = (typeof level === "string" && level.trim()) ? level.trim() : "junior";

    // Scenario 1: Custom Challenge (Description based)
    // Ensure description is a non-empty string
    if (description && typeof description === 'string' && description.trim().length > 0) {
        const { questions, debug } = await generateCustomQuizWithLLM(description.trim(), validLevel, options, validQuestionCount);
        res.json({ questions, debug });
        return;
    }

    // Scenario 2: List based (Idioms or Targets)
    // targetList is already defined above

    // Fix: If we fall through to here, it means description was invalid or missing.
    // If targetList is also missing, we return the error.
    if ((!Array.isArray(targetList) || targetList.length === 0) && !normalizedHistory?.length) {
      // Improve error message for debugging
      console.log("[Quiz] Invalid request body:", JSON.stringify(req.body));
      res.status(400).json({ error: "請提供列表 (targets array) 或描述 (description)。" });
      return;
    }

    const limitedTargets = normalizedHistory?.map((item) => item.idiom) || targetList.slice(0, 10);
    const validSelectionMode = selectionMode === "weakest" ? "weakest" : "latest";
    
    const { questions, debug } = await generateQuizWithLLM(
      limitedTargets,
      validLevel,
      options,
      quizType,
      validQuestionCount,
      normalizedHistory,
      validSelectionMode
    );
    res.json({ questions, debug });

  } catch (err) {
    console.error("[POST /api/quiz/generate]", err);
    const message = err.message || "測驗生成失敗，請稍後再試。";
    res.status(500).json({ error: message });
  }
}
