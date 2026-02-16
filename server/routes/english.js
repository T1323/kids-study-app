import { explainEnglishWithLLM } from "../services/llmService.js";

export async function postEnglishExplain(req, res) {
  try {
    const { word, level, apiKey, provider, model, baseURL } = req.body;

    if (!word) {
      return res.status(400).json({ error: "請提供單字 (word)" });
    }

    const result = await explainEnglishWithLLM(word, level || "junior", {
      apiKey,
      providerId: provider,
      model,
      baseURL,
    });

    if (result.status === "not_found") {
      return res.status(404).json({ error: "找不到該單字或無法解釋" });
    }

    res.json(result);
  } catch (error) {
    console.error("English explain error:", error);
    res.status(500).json({ error: error.message || "伺服器錯誤" });
  }
}
