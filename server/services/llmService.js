import OpenAI from "openai";
import { PROVIDERS } from "../config/providers.js";

const LEVEL_DESC = {
  junior: "目標對象：國小低中年級（約 7-9 歲）。風格：用詞簡單、句子短促、語氣親切活潑。避免使用生難字詞，多用具體的生活例子。解釋成語時，請像對小朋友說故事一樣，生動有趣。解釋英文單字時，請提供最基礎、最常見的字義，例句使用簡單的主詞+動詞結構。",
  senior: "目標對象：國小高年級（約 10-12 歲）。風格：用詞稍有難度，句子結構較完整。可以引用簡單的歷史典故，但解釋仍需淺顯易懂。重點在於成語的正確用法與情境。解釋英文單字時，可包含常用片語，例句可加入形容詞或副詞修飾。",
  "junior-high": "目標對象：國中生（約 13-15 歲）。風格：用詞精準，可探討成語的深層含義與典故由來。解釋可以包含更多文化背景，並比較相近成語的異同。解釋英文單字時，請包含詞性變化、同義詞比較，例句使用複合句。",
  university: "目標對象：高中生與大學生（約 16-20 歲）。風格：學術且專業。深入探討成語的文學價值、歷史演變及現代應用。適合進階學習者。解釋英文單字時，請涵蓋多重詞義、抽象概念及學術用法，例句應具備新聞或文學深度。",
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
  const levelDesc = LEVEL_DESC[level] || `自訂程度：${level}。請根據此程度要求調整內容風格與難易度。`;
  return `你是一位中文成語教學專家，專門為不同程度的學習者撰寫成語說明。

請針對「${idiom}」這個成語，撰寫適合「${levelDesc}」程度的說明。

請「只」回傳一個 JSON 物件，不要其他說明或 markdown。格式必須嚴格如下（含欄位名稱與雙引號）：

{
  "status": "found" 或 "not_found",
  "is_idiom": true 或 false,
  "idiom": "完整的詞彙或成語名稱 (若輸入不完整請自動補全，必須修正為正確全名)",
  "zhuyin": "每個字的注音，字與字之間空一格",
  "meaning": "一句或兩句的解釋，必須符合指定程度的理解能力",
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
 * 建立測驗的 Prompt (支援成語與英文)
 */
function buildQuizPrompt(targets, level, type = 'idiom') {
  const levelDesc = LEVEL_DESC[level] || `自訂程度：${level}。請根據此程度要求調整內容風格與難易度。`;
  const targetsStr = targets.join("、");
  
  if (type === 'english') {
    return `你是一位英文測驗出題老師，專門為不同程度的學習者設計英文單字測驗。

請針對以下英文單字列表：「${targetsStr}」，設計 10 題選擇題。內容必須適合「${levelDesc}」程度。

請「只」回傳一個 JSON 陣列 (Array)，不要其他說明或 markdown。
陣列中每個物件代表一個題目，格式必須嚴格如下：

[
  {
    "id": "1",
    "target": "apple", // 該題考的目標單字
    "type": "meaning", // 題目類型：meaning (英選中), usage (用法/填空), spelling (拼字辨析)
    "question": "題目敘述 (若是 usage 題型，請挖空單字，並以底線 _____ 表示)",
    "options": ["選項A", "選項B", "選項C", "選項D"],
    "answer": "正確選項內容 (必須完全符合 options 中的某一項)",
    "explanation": "解析 (為何選這個答案，請用繁體中文回答)"
  },
  ...
]

出題規則：
1. 題目類型請混合 meaning (選中文意思), usage (句子填空), spelling (易混淆字辨析)。
2. 盡量平均分配題目給列表中的單字。
3. 選項必須有 4 個。
4. 內容與英文句子難易度需符合「${levelDesc}」。
5. 若單字數量不足 10 個，可重複出題，總數需為 10 題。
`;
  }

  // Default to idiom
  return `你是一位成語測驗出題老師，專門為不同程度的學習者設計成語測驗。

請針對以下成語列表：「${targetsStr}」，設計 10 題選擇題。內容必須適合「${levelDesc}」程度。

請「只」回傳一個 JSON 陣列 (Array)，不要其他說明或 markdown。
陣列中每個物件代表一個題目，格式必須嚴格如下：

[
  {
    "id": "1",
    "target": "一石二鳥", // 該題考的目標成語
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
4. 內容與用語難易度需符合「${levelDesc}」。
5. 若成語數量不足 10 個，可重複出題或針對同一成語出不同類型的題目，總數需為 10 題。
`;
}

/**
 * 呼叫 LLM 生成測驗 (成語或英文)
 * @param {string[]} targets
 * @param {"junior"|"senior"} level
 * @param {{ apiKey?: string, providerId?: string, model?: string, baseURL?: string }} options
 * @param {'idiom'|'english'} type
 */
export async function generateQuizWithLLM(targets, level, options = {}, type = 'idiom') {
  const { client, model } = getClientAndModel(options);
  const prompt = buildQuizPrompt(targets, level, type);

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
    // Ensure each question has a target field if missing (heuristic match)
    return result.map(q => {
        if (!q.target) {
            // Try to find which target is in the answer or question
            const matched = targets.find(t => q.answer.includes(t) || q.question.includes(t));
            if (matched) q.target = matched;
        }
        return q;
    });
  } catch (e) {
    console.error("JSON parse error (Quiz):", content);
    throw new Error("模型回傳格式錯誤，請重試");
  }
}

/**
 * 建立英文單字解釋的 Prompt
 */
function buildEnglishPrompt(word, level) {
  const levelDesc = LEVEL_DESC[level] || `自訂程度：${level}。請根據此程度要求調整內容風格與難易度。`;
  return `你是一位親切的英文老師，專門教導不同程度的學生英文單字。

請針對英文單字「${word}」，撰寫適合「${levelDesc}」程度的教學內容。

請「只」回傳一個 JSON 物件，不要其他說明或 markdown。格式必須嚴格如下：

{
"status": "found", // 若找不到該字或拼字錯誤，填 "not_found"
"word": "${word}", // 修正後的确切單字 (例如 user 輸入 appple，修正為 apple)
"kk_phonetic": "[KK音標]",
"part_of_speech": "詞性 (例如 n., v., adj.)",
"meaning_en": "英文解釋 (難易度需適合指定程度)",
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
2. 解釋與例句的難易度必須符合「${levelDesc}」。
3. 英文解釋請使用適合該程度的詞彙。
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

/**
 * 建立自訂測驗的 Prompt
 */
function buildCustomQuizPrompt(description, level) {
  const levelDesc = LEVEL_DESC[level] || `自訂程度：${level}。請根據此程度要求調整內容風格與難易度。`;
  return `你是一位英文測驗出題老師，專門為不同程度的學習者設計英文測驗。

請針對使用者的描述：「${description}」，設計 10 題相關的英文選擇題。內容必須適合「${levelDesc}」程度。

請「只」回傳一個 JSON 陣列 (Array)，不要其他說明或 markdown。
陣列中每個物件代表一個題目，格式必須嚴格如下：

[
  {
    "id": "1",
    "target": "menu", // 該題考的目標單字或重點
    "type": "meaning", // 題目類型：meaning (英選中), usage (用法/填空), dialogue (對話理解)
    "question": "題目敘述 (若是 usage 題型，請挖空單字，並以底線 _____ 表示)",
    "options": ["選項A", "選項B", "選項C", "選項D"],
    "answer": "正確選項內容 (必須完全符合 options 中的某一項)",
    "explanation": "解析 (為何選這個答案，請用繁體中文回答)"
  },
  ...
]

出題規則：
1. 題目類型請混合 meaning, usage, dialogue。
2. 題目內容需與使用者描述的主題高度相關。
3. 選項必須有 4 個。
4. 內容與英文句子難易度需符合「${levelDesc}」。
5. 總數需為 10 題。
`;
}

/**
 * 呼叫 LLM 生成自訂測驗
 * @param {string} description
 * @param {"junior"|"senior"} level
 * @param {{ apiKey?: string, providerId?: string, model?: string, baseURL?: string }} options
 */
export async function generateCustomQuizWithLLM(description, level, options = {}) {
  const { client, model } = getClientAndModel(options);
  const prompt = buildCustomQuizPrompt(description, level);

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
    console.error("JSON parse error (Custom Quiz):", content);
    throw new Error("模型回傳格式錯誤，請重試");
  }
}
