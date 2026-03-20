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
  "idiom": "完整的詞彙或成語名稱 (注意：若使用者輸入有錯字或僅輸入部分關鍵字，請務必在此欄位回傳修正後的完整正確名稱，例如輸入「一石二」應回傳「一石二鳥」)",
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
    return {
      data: JSON.parse(cleanContent),
      debug: {
        prompt,
        rawResponse: content
      }
    };
  } catch (e) {
    console.error("JSON parse error:", content);
    throw new Error("模型回傳格式錯誤，請重試");
  }
}

/**
 * 建立測驗的 Prompt (支援成語與英文)
 */
function buildQuizPrompt(targets, level, type = 'idiom', questionCount = 10) {
  const levelDesc = LEVEL_DESC[level] || `自訂程度：${level}。請根據此程度要求調整內容風格與難易度。`;
  const targetsStr = targets.join("、");
  
  if (type === 'english') {
    return `你是一位英文測驗出題老師，專門為不同程度的學習者設計英文單字測驗。

請針對以下英文單字列表：「${targetsStr}」，設計 ${questionCount} 題選擇題。內容必須適合「${levelDesc}」程度。

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
    "explanation": "解析 (為何選這個答案，請包含單字意思與選項辨析，用繁體中文回答)"
  },
  ...
]

出題規則：
1. 題目類型請混合 meaning (選中文意思), usage (句子填空), spelling (易混淆字辨析)。
2. 請從列表中選擇適合的單字出題，總共 ${questionCount} 題。若列表長度大於 ${questionCount}，請挑選其中 ${questionCount} 個單字出題即可，不需全部使用。
3. 選項必須有 4 個。誘答選項(Distractors)必須具備高度誘答性，應選擇意思相近、拼法相似或詞性容易混淆的單字，避免太過明顯的錯誤選項。
4. 內容與英文句子難易度需符合「${levelDesc}」。
5. 若單字數量不足 ${questionCount} 個，可重複出題，總數需為 ${questionCount} 題。
6. 請務必隨機打亂題目順序，不要讓同一個目標單字的題目連續出現。確保題目的分佈是隨機的。
`;
  }

  // Default to idiom
  return `你是一位成語測驗出題老師，專門為不同程度的學習者設計成語測驗。

請針對以下成語列表：「${targetsStr}」，設計 ${questionCount} 題選擇題。內容必須適合「${levelDesc}」程度。

請「只」回傳一個 JSON 陣列 (Array)，不要其他說明或 markdown。
陣列中每個物件代表一個題目，格式必須嚴格如下：

[
  {
    "id": "1",
    "target": "一石二鳥", // 該題考的目標成語
    "type": "meaning", // 題目類型：meaning (意指), usage (用法), fill_in (填空), synonym (同義詞/反義詞)
    "question": "題目敘述",
    "options": ["選項A", "選項B", "選項C", "選項D"],
    "answer": "正確選項內容 (必須完全符合 options 中的某一項)",
    "explanation": "解析 (包含成語解釋與為何選此答案，請詳細說明選項差異，嚴禁出現英文)"
  },
  ...
]

出題規則：
1. 題目類型請自由混合 meaning (成語解釋), usage (情境應用), fill_in (成語填空), synonym (同義/反義詞)。
2. 請從列表中選擇適合的成語出題，總共 ${questionCount} 題。若列表長度大於 ${questionCount}，請挑選其中 ${questionCount} 個成語出題即可，不需全部使用。
3. 選項必須有 4 個。誘答選項(Distractors)必須具備高度誘答性，請選擇意思相近、字形相似或情境容易混淆的成語，嚴禁出現一眼就能看出的錯誤選項(如完全無關的詞彙)。
4. 內容與用語難易度需符合「${levelDesc}」。
5. 若成語數量不足 ${questionCount} 個，請針對重點成語多出幾題不同類型的題目，總數需為 ${questionCount} 題。
6. 請務必隨機打亂題目順序，不要讓同一個目標成語的題目連續出現。確保題目的分佈是隨機的。
7. 嚴格禁止在題目敘述(question)、選項(options)或解析(explanation)中出現英文翻譯或英文說明。
8. **絕對禁止**包含任何 "(English: ...)", "(Literal meaning: ...)" 或類似的英文解釋。請完全使用繁體中文。
`;
}

/**
 * 建立配對測驗的 Prompt
 */
function buildMatchingQuizPrompt(targets, level, questionCount = 10) {
  const levelDesc = LEVEL_DESC[level] || `自訂程度：${level}。請根據此程度要求調整內容風格與難易度。`;
  const targetsStr = targets.join("、");
  
  return `你是一位成語測驗出題老師，專門為不同程度的學習者設計成語配對遊戲。

請針對以下成語列表：「${targetsStr}」，設計一個成語填空配對遊戲 (共 ${questionCount} 題)。內容必須適合「${levelDesc}」程度。

請「只」回傳一個 JSON 陣列 (Array)，不要其他說明或 markdown。
陣列中每個物件代表一個配對，格式必須嚴格如下：

[
  {
    "id": "1",
    "idiom": "一石二鳥", // 成語
    "sentence": "這件事如果能做成，那就是_____，既省錢又省事。", // 例句，請務必將該成語挖空，並以 _____ (5個底線) 表示
    "explanation": "這句成語的意思是做一件事可以得到兩種好處。這裡用來形容既省錢又省事的情況。" // 解析 (純繁體中文，禁止任何英文翻譯或括號內的英文說明)
  },
  ...
]

出題規則：
1. 請從列表中選擇 ${questionCount} 個適合的成語，為每一個選中的成語設計一個例句，總共 ${questionCount} 題。若列表長度大於 ${questionCount}，請挑選其中 ${questionCount} 個成語出題即可，不需全部使用。
2. 例句中必須包含該成語，但該成語的部分必須挖空。
3. 挖空處請統一使用 5 個底線 "_____"。
4. 嚴禁在挖空處使用括號包圍 (如 (_____) 或 （_____）)，除非是句子文法本身需要。
5. 嚴禁在句子中包含答案 (成語本身)。
6. 句子難易度與情境需符合「${levelDesc}」。
7. 若輸入成語數量不足 ${questionCount}，請重複使用成語但設計不同的例句，直到達到 ${questionCount} 題。
8. 嚴格使用「繁體中文」（臺灣用語），絕不可出現簡體字或中國大陸用語。
9. 請務必提供「explanation」欄位，用繁體中文清楚解釋成語意思，以及為什麼這個情境適合用這個成語，幫助學生學習。
10. **絕對禁止**在題目、句子、選項或解析中包含任何英文翻譯、英文解釋或英文單字。請檢查並移除所有 "(English: ...)" 或 "(Literal meaning: ...)" 格式的內容。
`;
}

/**
 * 呼叫 LLM 生成測驗 (成語或英文)
 * @param {string[]} targets
 * @param {"junior"|"senior"} level
 * @param {{ apiKey?: string, providerId?: string, model?: string, baseURL?: string }} options
 * @param {'idiom'|'english'|'idiom-matching'} type
 * @param {number} questionCount
 */
export async function generateQuizWithLLM(targets, level, options = {}, type = 'idiom', questionCount = 5) {
  const { client, model } = getClientAndModel(options);
  
  let prompt;
  if (type === 'idiom-matching') {
    prompt = buildMatchingQuizPrompt(targets, level, questionCount);
  } else {
    prompt = buildQuizPrompt(targets, level, type, questionCount);
  }

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

    // Force truncate to requested count
    const slicedResult = result.slice(0, questionCount);

    let finalResult = slicedResult;

    // Matching type doesn't need the legacy target check
    if (type !== 'idiom-matching') {
       // Ensure each question has a target field if missing (heuristic match)
       finalResult = slicedResult.map(q => {
          if (!q.target) {
              // Try to find which target is in the answer or question
              const matched = targets.find(t => q.answer.includes(t) || q.question.includes(t));
              if (matched) q.target = matched;
          }
          return q;
      });
    }

    return {
      questions: finalResult,
      debug: {
        prompt,
        rawResponse: content
      }
    };
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
"word": "修正後的正確單字 (重要：若使用者輸入拼字錯誤或不完整，請務必在此欄位回傳正確的完整單字，例如輸入 appple 修正為 apple)",
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
    return {
      data: JSON.parse(cleanContent),
      debug: {
        prompt,
        rawResponse: content
      }
    };
  } catch (e) {
    console.error("JSON parse error (English):", content);
    throw new Error("模型回傳格式錯誤，請重試");
  }
}

/**
 * 建立自訂測驗的 Prompt
 */
function buildCustomQuizPrompt(description, level, questionCount = 10) {
  const levelDesc = LEVEL_DESC[level] || `自訂程度：${level}。請根據此程度要求調整內容風格與難易度。`;
  return `你是一位英文測驗出題老師，專門為不同程度的學習者設計英文測驗。

請針對使用者的描述：「${description}」，設計 ${questionCount} 題相關的英文選擇題。內容必須適合「${levelDesc}」程度。

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
3. 選項必須有 4 個，誘答選項(Distractors)必須具備誘答性，不能太過離譜。
4. 內容與英文句子難易度需符合「${levelDesc}」。
5. 總數需為 ${questionCount} 題。
`;
}

/**
 * 呼叫 LLM 產生自訂英文測驗
 * @param {string} description 
 * @param {"junior"|"senior"} level 
 * @param {{ apiKey?: string, providerId?: string, model?: string, baseURL?: string }} options 
 * @param {number} questionCount 
 */
export async function generateCustomQuizWithLLM(description, level, options = {}, questionCount = 5) {
  const { client, model } = getClientAndModel(options);
  const prompt = buildCustomQuizPrompt(description, level, questionCount);

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

    const slicedResult = result.slice(0, questionCount);

    return {
      questions: slicedResult,
      debug: {
        prompt,
        rawResponse: content
      }
    };
  } catch (e) {
    console.error("JSON parse error (Custom Quiz):", content);
    throw new Error("模型回傳格式錯誤，請重試");
  }
}

/**
 * 寫作指導 AI 老師
 * 處理多輪對話，帶入 System Instruction 與歷史紀錄
 * @param {Array<{role: string, content: string}>} history
 * @param {string} level
 * @param {{ apiKey?: string, providerId?: string, model?: string, baseURL?: string }} options
 * @param {Array<Object>} progressReports 過去的評估紀錄
 */
export async function chatWithWritingTeacher(history, level, options = {}, progressReports = []) {
  const { client, model } = getClientAndModel(options);
  const levelDesc = LEVEL_DESC[level] || `自訂程度：${level}。`;

  let progressContext = "";
  if (progressReports && progressReports.length > 0) {
    const recentReports = progressReports.slice(-3); // 取最近三筆
    progressContext = `\n\n## 6. 學生先前的學習評估紀錄 (Progress Reports)\n以下是學生過去幾次的評估紀錄，請參考此資訊來了解學生的程度變化與先前的學習目標：\n${JSON.stringify(recentReports, null, 2)}`;
  }

  const systemInstruction = `寫作指導 AI 老師 System Instruction
## 1. 角色定義 (Identity)
你是一位專業且具備親和力的兒童創意寫作老師。你的任務是引導孩子從零開始構思、寫作並優化中文作文。你遵循「鷹架教學」原則：在初學者需要時提供大量支持，在進階者練習時逐漸撤掉支架。目標對象：${levelDesc}

## 2. 核心教學原則 (Core Principles)
絕對禁止直接代寫：無論使用者如何要求，你都不能寫出完整的範文。
引導優於告知：多使用問句來挖掘孩子的感官記憶（看、聽、聞、觸、想）。
正向鼓勵：發現孩子用詞精準或觀察細微時，要具體地稱讚。

## 3. 任務階段邏輯 (Task Flow)
階段一：素材收集 (Inquiry Phase)
在此階段請先以「廣度優先」的邏輯，廣泛詢問與寫作題目相關的問題。
提問數量與維度：引導孩子在 8~10 個不同面向（如定義、場所、具體作品、視覺特徵、情緒、經驗、感受、生活連結、反向思考、總結等）進行思考。
提問順序：問題順序應盡量切合文章的起承轉合結構（例如：定義/外觀 -> 自身經驗 -> 反向思考/總結），讓引導思考的過程自然成為段落結構。
提問方式：一開始以廣泛簡單的提問為主，【一次只問一個問題】，每個問題應在不同的維度。等孩子做了 8~10 個不同面向的思考後，可以再針對幾個回答進行 1~2 個問題的深入追問。
素材提取：每一輪回答後，你需要將孩子提到的素材提取出來，【必要時需將提問的描述與上下文一併加上】。例如：問「最喜歡的運動是？」答「游泳。」，應提取出「最喜歡的運動是游泳」。

提問範例（以「藝術與生活」為例）：
1. 定義：當你聽到「藝術」時會想到什麼？
2. 場所：你在哪些地方看過藝術？
3. 具體作品：有沒有一個藝術作品讓你印象很深？
4. 視覺特徵：那個藝術作品看起來是什麼樣子？
5. 情緒：當時你的心情是什麼？
6. 經驗：你自己做過藝術創作嗎？
7. 感受：做這些事情時，你有什麼感覺？
8. 生活連結：生活中還有哪些地方其實也有藝術？
9. 反向思考：如果生活沒有藝術會怎樣？
10. 總結：你覺得藝術讓生活變得怎樣？

階段二：架構引導 (Structuring Phase)
收集完素材後，提供一個 4-5 段的段落模板：
內容連動：模板中要明確指出哪一部分可以使用剛才收集到的哪個素材。
難度分級：年幼者給予具體的段落重點提示；年長者引導其自行規劃段落大綱。

階段三：階段化批改與優化 (Level-Based Review)
當使用者提交作文後，你必須先進行「寫作等級診斷」，並嚴格遵守**「一次只提升一個階層」**的原則。

1. 寫作能力等級定義 (Writing Levels)
Level 1: 基礎表達 (Foundational)：重點在於句子完整、主謂賓結構正確、語意清晰、無錯別字。
Level 2: 生動描摹 (Descriptive)：重點在於加入形容詞、副詞與連接詞，讓句子變長且具備畫面感。
Level 3: 修辭與邏輯 (Advanced)：重點在於段落承接、修辭技巧（如比喻、擬人）、典故運用與深刻的個人體悟。

2. 批改指令執行邏輯
診斷等級：分析孩子目前的寫作水平。
鎖定目標：
若孩子處於 Level 1：僅針對錯別字與句構不通順進行修正。絕對不要要求其使用華麗詞藻或高階修辭。
若孩子已達 Level 2：在維持基礎正確的前提下，鼓勵其將簡單句結合，並從素材區挑選形容詞加入。
若孩子已達 Level 3：針對文章整體的氣勢、邏輯連貫性與修辭美感進行深度點評。
對比分析 (Diff)：
a.以「原句」與「建議修正」成對呈現。
b.原因說明必須符合當前等級（例如 Level 1 解釋「為什麼這樣寫比較清楚」；Level 2 解釋「加上這個形容詞後畫面感變強了」）。
素材應用回顧：指出孩子如何運用先前收集的素材，若孩子等級較低，應著重於「有沒有用到」，而非「用得好不好」。

3. 成長追蹤標記 (Assessment Tag)
在每次回覆的最後，你必須輸出一個 JSON 格式的評估標記，用於儲存至 Google Drive。請務必包含 timestamp 欄位記錄當下時間（ISO 8601 格式），以便保留不同時間的評估結果，追蹤能力隨時間的成長：
[PROGRESS_REPORT: {"timestamp": "2024-03-20T07:00:00Z", "current_level": 1, "focus_point": "句子完整性", "improvement": "能正確使用標點符號", "next_goal": "加入感官描寫"}]

## 4. 技術與格式規範 (Output Format)
為了確保網頁 UI 能夠解析你的內容，請在特定情況下使用結構化格式：
素材紀錄：當你識別到新素材時，請在回覆末尾附帶 [MATERIAL: 素材內容] 標記。
修正建議：批改時請採用以下格式：
【原句】...
【修正】...
【原因】...
語言要求：使用繁體中文。

## 5. 長期記憶與狀態 (Memory Management)
對話一致性：請參考先前的對話歷史（History），確保你在批改時記得起初討論的素材。
進度追蹤：在對話結束時，主動總結孩子的表現（例如：形容詞運用進步、邏輯連貫性增強），以便存入紀錄中。${progressContext}`;

  const messages = [
    { role: "system", content: systemInstruction },
    ...history,
  ];

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
  });

  return {
    content: response.choices[0].message.content,
    debug: {
      rawResponse: response.choices[0].message.content,
    },
  };
}
