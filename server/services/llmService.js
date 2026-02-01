import OpenAI from "openai";
import { PROVIDERS } from "../config/providers.js";

const LEVEL_DESC = {
  junior: "低年級（用詞簡單、句子短、適合約 6 歲）",
  senior: "高年級（可稍難、句子較完整、適合約 11 歲）",
};

/**
 * 取得此請求要用的 OpenAI 相容 client 與 model。
 * @param {{ apiKey?: string, providerId?: string, model?: string, baseURL?: string }} options
 */
function getClientAndModel(options = {}) {
  const { apiKey, providerId, model: overrideModel, baseURL: overrideBaseURL } = options;
  const trimmedKey = typeof apiKey === "string" ? apiKey.trim() : "";

  if (!trimmedKey) {
    throw new Error("請提供 API Key (API Key is required)");
  }

  if (providerId || (overrideBaseURL && overrideModel)) {
    const provider = providerId && PROVIDERS[providerId];
    const baseURL = overrideBaseURL || (provider?.baseURL ?? "");
    const model = overrideModel || provider?.model || process.env.LLM_MODEL || "gpt-4o-mini";
    if (baseURL && model) {
      const client = new OpenAI({
        apiKey: trimmedKey,
        baseURL: baseURL.endsWith("/") ? baseURL : baseURL + "/",
      });
      return { client, model };
    }
  }

  // 若未指定 provider，使用後端預設的 BaseURL (例如 Gemini)，但使用前端傳來的 Key
  return {
    client: new OpenAI({
      apiKey: trimmedKey,
      baseURL: process.env.LLM_BASE_URL || undefined,
    }),
    model: process.env.LLM_MODEL || "gpt-4o-mini",
  };
}

/**
 * 組出給 LLM 的 prompt，要求回傳固定格式的 JSON。
 */
function buildPrompt(idiom, level) {
  const levelDesc = LEVEL_DESC[level];
  return `你是一位中文成語教學專家，專門為國小學童撰寫成語說明。

請針對「${idiom}」這個成語，撰寫適合「${levelDesc}」的說明。

請「只」回傳一個 JSON 物件，不要其他說明或 markdown。格式必須嚴格如下（含欄位名稱與雙引號）：

{
  "status": "found" 或 "not_found",
  "is_idiom": true 或 false,
  "idiom": "完整的詞彙或成語名稱 (若輸入不完整請自動補全，必須修正為正確全名)",
  "zhuyin": "每個字的注音，字與字之間空一格",
  "meaning": "一句或兩句的解釋，讓小朋友看得懂",
  "usage": "簡短用法說明（何時會用到這個詞）",
  "examples": [
    { "zh": "一句中文例句" },
    { "zh": "第二句中文例句" }
  ],
  "tips": "一句小提醒或延伸學習（可選）"
}

填寫規則：
1. 若輸入完全無意義或無法辨識，status 填 "not_found"，其餘欄位可省略。
2. 若輸入具有意義（包含成語、俗諺、流行語、普通詞彙）：
   - status 填 "found"。
   - 若是標準成語，is_idiom 填 true。
   - 若是俗諺、流行語或普通詞彙（如「早安」），is_idiom 必須填 false，並在 tips 欄位說明它為何不是成語。

注意：
- 全部使用繁體中文。
- zhuyin 請用注音符號（ㄅㄆㄇ等），不要用羅馬拼音。
- examples 至少兩句，每句一個物件，只要 "zh" 欄位。
- 不要包含英文。`;
}

/**
 * 呼叫 LLM，取得成語說明並轉成前端需要的形狀。
 * @param {string} idiom
 * @param {"junior"|"senior"} level
 * @param {{ apiKey?: string, providerId?: string, model?: string, baseURL?: string }} options
 */
export async function explainIdiomWithLLM(idiom, level, options = {}) {
  const { client, model } = getClientAndModel(options);
  const prompt = buildPrompt(idiom, level);

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "你只回傳符合指定格式的 JSON，不輸出任何其他文字或 markdown 標記。",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });

  const content = response.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("LLM 未回傳內容");
  }

  let jsonStr = content;
  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    jsonStr = codeBlock[1].trim();
  }

  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error("LLM 回傳無法解析為 JSON：" + content.slice(0, 200));
  }

  if (data.status === "not_found") {
    throw new Error("找不到相近成語");
  }

  return {
    idiom: String(data.idiom ?? idiom),
    is_idiom: typeof data.is_idiom === "boolean" ? data.is_idiom : true, // 預設 true 以相容舊格式
    zhuyin: data.zhuyin ? String(data.zhuyin) : undefined,
    meaning: String(data.meaning ?? ""),
    usage: data.usage ? String(data.usage) : undefined,
    examples: Array.isArray(data.examples)
      ? data.examples.map((ex) => ({ zh: String(ex?.zh ?? "") }))
      : [],
    tips: data.tips ? String(data.tips) : undefined,
    level,
  };
}
