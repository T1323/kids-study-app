import OpenAI from "openai";
import { PROVIDERS, detectProviderFromApiKey } from "../config/providers.js";

export async function postFetchModels(req, res) {
  try {
    const { apiKey, providerId, customBaseURL } = req.body || {};
    const trimmedKey = typeof apiKey === "string" ? apiKey.trim() : "";
    
    if (!trimmedKey) {
      return res.status(400).json({ error: "請提供 API Key。" });
    }

    let pId = providerId || detectProviderFromApiKey(trimmedKey);
    const provider = pId && PROVIDERS[pId];
    const baseURL = customBaseURL || (provider?.baseURL ?? "");

    const client = new OpenAI({
      apiKey: trimmedKey,
      baseURL: baseURL ? (baseURL.endsWith("/") ? baseURL : baseURL + "/") : undefined,
    });

    const response = await client.models.list();
    const models = response.data;
    
    const validModels = models.filter(m => {
      const id = m.id.toLowerCase();
      
      // Known models to exclude for our specific text-gen use cases
      if (
          id.includes("whisper") || 
          id.includes("tts") || 
          id.includes("dall-e") || 
          id.includes("embedding") || 
          id.includes("babbage") || 
          id.includes("davinci") || 
          id.includes("vision") ||
          id.includes("audio") ||
          id.includes("aqa") || // Gemini specific AQA models
          id.includes("learnlm") || // Experimental Gemini models
          id.includes("experimental")
      ) {
          return false;
      }
      
      // Filter out legacy Gemini models
      if (id.startsWith("gemini-1.0")) return false;
      if (id === "gemini-pro") return false;

      // Filter out OpenAI instruct models if any since chat completions are better
      if (id.includes("-instruct")) return false;

      return true;
    }).map(m => m.id);

    // Sort models alphabetically
    res.json({ models: validModels.sort() });
  } catch (err) {
    console.error("[POST /api/models/fetch]", err);
    res.status(401).json({ error: "API Key 無效或無法取得模型清單。" });
  }
}
