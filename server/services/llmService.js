import OpenAI from "openai";
import { PROVIDERS } from "../config/providers.js";

const LEVEL_DESC = {
  junior: "低年級（用詞簡單、句子短、適合約 6 歲）",
  senior: "高年級（可稍難、句子較完整、適合約 11 歲）",
  "junior-high": "國中（內容可深入、探討典故與應用、適合約 14 歲）",
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
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  // 嘗試解析 JSON
  try {
    // 有時候模型會回傳 ```json ... ```，需去掉
    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanContent);
  } catch (e) {
    console.error("JSON parse error:", content);
    throw new Error("模型回傳格式錯誤，請重試");
  }
}

/**
 * 建立成語測驗的 Prompt
 */
function buildQuizPrompt(idioms, level) {
  const levelDesc = LEVEL_DESC[level];
  const idiomsStr = idioms.join("、");
  return `你是一位成語測驗出題老師，專門為國小學童設計成語測驗。

請針對以下成語列表：「${idiomsStr}」，設計 5 題選擇題。適合「${levelDesc}」。

請「只」回傳一個 JSON 陣列 (Array)，不要其他說明或 markdown。
陣列中每個物件代表一個題目，格式必須嚴格如下：

[
  {
    "id": "1",
    "type": "meaning", // 題目類型：meaning (意指), usage (用法), fill_in (填空)
    "question": "題目敘述",
    "options": ["選項A", "選項B", "選項C", "選項D"],
    "answer": "正確選項內容 (必須完全符合 options 中的某一項)",
    "explanation": "解析 (為何選這個答案)"
  },
  ...
]

出題規則：
1. 題目類型請混合 meaning (成語解釋), usage (情境應用), fill_in (成語填空)。
2. 盡量平均分配題目給列表中的成語，不要只考同一個。
3. 選項必須有 4 個。
4. 內容要適合小學生，用語親切簡單。
5. 若成語數量不足 5 個，可重複出題或針對同一成語出不同類型的題目，總數需為 5 題。
`;
}

/**
 * 呼叫 LLM 生成成語測驗
 * @param {string[]} idioms
 * @param {"junior"|"senior"} level
 * @param {{ apiKey?: string, providerId?: string, model?: string, baseURL?: string }} options
 */
export async function generateQuizWithLLM(idioms, level, options = {}) {
  const { client, model } = getClientAndModel(options);
  const prompt = buildQuizPrompt(idioms, level);

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "你只回傳符合指定格式的 JSON Array，不輸出任何其他文字或 markdown 標記。",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  try {
    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanContent);
    if (!Array.isArray(result)) {
      throw new Error("回傳格式不是陣列");
    }
    return result;
  } catch (e) {
    console.error("JSON parse error (Quiz):", content);
    throw new Error("模型回傳格式錯誤，請重試");
  }
}

/**
 * 建立英文單字解釋的 Prompt
 */
function buildEnglishPrompt(word, level) {
  const levelDesc = LEVEL_DESC[level];
  return `你是一位親切的英文老師，專門教導台灣國小學生英文單字。

請針對英文單字「${word}」，撰寫適合「${levelDesc}」的教學內容。

請「只」回傳一個 JSON 物件，不要其他說明或 markdown。格式必須嚴格如下：

{
"status": "found", // 若找不到該字或拼字錯誤，填 "not_found"
"word": "${word}", // 修正後的确切單字 (例如 user 輸入 appple，修正為 apple)
"kk_phonetic": "[KK音標]",
"part_of_speech": "詞性 (例如 n., v., adj.)",
"meaning_en": "簡單的英文解釋 (適合小孩)",
"meaning_zh": "繁體中文解釋",
"examples": [
  { "en": "英文例句1", "zh": "中文翻譯1" },
  { "en": "英文例句2", "zh": "中文翻譯2" }
],
"synonyms": ["同義詞1", "同義詞2"], // 可選，若無填空陣列
"antonyms": ["反義詞1", "反義詞2"], // 可選，若無填空陣列
"tips": "記憶小撇步或延伸用法 (繁體中文)"
}

注意：
1. 若輸入的不是單字 (是句子或亂碼)，請回傳 {"status": "not_found"}。
2. 解釋要簡單易懂，適合小學生。
3. 英文解釋請用簡單的英文。
4. KK音標請準確。
`;
}

/**
* 呼叫 LLM 解釋英文單字
*/
export async function explainEnglishWithLLM(word, level, options = {}) {
  const { client, model } = getClientAndModel(options);
  const prompt = buildEnglishPrompt(word, level);

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
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  try {
    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanContent);
  } catch (e) {
    console.error("JSON parse error (English):", content);
    throw new Error("模型回傳格式錯誤，請重試");
  }
}
