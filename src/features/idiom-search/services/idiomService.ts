import { IdiomExplain, IdiomExplainRequest } from "../types";

const API_BASE =
  typeof import.meta.env.VITE_API_BASE_URL === "string" &&
  import.meta.env.VITE_API_BASE_URL.trim() !== ""
    ? import.meta.env.VITE_API_BASE_URL.trim().replace(/\/$/, "")
    : "http://localhost:3000";

export interface ProviderOption {
  id: string;
  name: string;
  getKeyUrl: string | null;
}

/**
 * 取得可選的模型/服務清單（供下拉選單）。
 */
export async function fetchProviders(): Promise<ProviderOption[]> {
  const res = await fetch(`${API_BASE}/api/providers`);
  if (!res.ok) throw new Error("無法取得模型清單");
  return res.json();
}

/**
 * 依 API Key 前綴推測可能的 provider（供自動選取）。
 */
export async function fetchDetectProvider(key: string): Promise<{ provider: string | null }> {
  const k = encodeURIComponent(key.trim());
  const res = await fetch(`${API_BASE}/api/providers/detect?key=${k}`);
  if (!res.ok) return { provider: null };
  return res.json();
}

/**
 * 呼叫後端 API，由 LLM 生成成語說明。
 */
export async function fetchIdiomExplain(
  req: IdiomExplainRequest
): Promise<IdiomExplain> {
  const body: Record<string, unknown> = {
    idiom: req.idiom,
    level: req.level,
  };
  if (req.apiKey?.trim()) {
    body.apiKey = req.apiKey.trim();
    if (req.provider?.trim()) body.provider = req.provider.trim();
    if (req.model?.trim()) body.model = req.model.trim();
    if (req.baseURL?.trim()) body.baseURL = req.baseURL.trim();
  }
  const res = await fetch(`${API_BASE}/api/idiom/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string })?.error || `請求失敗（${res.status}）`
    );
  }
  return res.json();
}

/**
 * Mock 版本，供後端未啟動或離線時使用。
 */
export async function fetchIdiomExplainMock(
  req: IdiomExplainRequest
): Promise<IdiomExplain> {
  // 模擬非同步呼叫
  await new Promise((resolve) => setTimeout(resolve, 600));

  const baseIdiom = req.idiom || "畫蛇添足";
  const level = req.level;

  if (level === "junior") {
    return {
      idiom: baseIdiom,
      zhuyin: "ㄏㄨㄚˋ ㄕㄜˊ ㄊㄧㄢ ㄗㄨˊ",
      level,
      meaning:
        "本來東西已經很好了，卻又多做了一些不需要的事情，反而把原本的好處破壞掉。",
      usage:
        "常用來形容做事「太貪心、太多餘」，本來簡單就好的，卻一直加上去，結果變糟。",
      examples: [
        {
          zh: "這份作業已經寫得很清楚了，再一直加東西上去，就有點畫蛇添足了。"
        },
        {
          zh: "媽媽說禮物不用太多，心意到就好，別畫蛇添足。"
        }
      ],
      tips:
        "可以和「錦上添花」做比較：「畫蛇添足」是多做反而變糟；「錦上添花」是多做讓事情變更好。"
    };
  }

  // senior 模式：用詞與說明較深
  return {
    idiom: baseIdiom,
    zhuyin: "ㄏㄨㄚˋ ㄕㄜˊ ㄊㄧㄢ ㄗㄨˊ",
    level,
    meaning:
      "原意是畫一條蛇卻又多畫了腳，比喻在事情已經足夠完善時，還硬要多加東西，結果不但沒有更好，反而破壞原本的完整與美感。",
    usage:
      "多帶有「多此一舉」「弄巧成拙」的語氣，提醒人做事要拿捏分寸，不要因為追求更好而忽略了「適可而止」。",
    examples: [
      {
        zh: "這篇文章本來結尾很有力量，卻又硬塞一大段說明，反而顯得畫蛇添足。"
      },
      {
        zh: "簡報設計如果效果太多，反而會搶走內容的重點，這就是畫蛇添足。"
      }
    ],
    tips:
      "想一想，你最近有沒有因為太想做到完美，而不小心「畫蛇添足」呢？"
  };
}

/**
 * 是否使用後端 API（有設 VITE_USE_MOCK=true 時用 mock，否則用後端）。
 */
function useMock(): boolean {
  return import.meta.env.VITE_USE_MOCK === "true";
}

/**
 * 對外使用的查詢函式：有開 mock 時用 mock，否則呼叫後端。
 */
export async function fetchIdiomExplainOrMock(
  req: IdiomExplainRequest
): Promise<IdiomExplain> {
  if (useMock()) return fetchIdiomExplainMock(req);
  return fetchIdiomExplain(req);
}

