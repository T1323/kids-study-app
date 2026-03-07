import { IdiomExplain, IdiomExplainRequest } from "../types";

const API_BASE =
  typeof import.meta.env.VITE_API_BASE_URL === "string" &&
  import.meta.env.VITE_API_BASE_URL.trim() !== ""
    ? import.meta.env.VITE_API_BASE_URL.trim().replace(/\/$/, "")
    : import.meta.env.PROD
    ? ""
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
  const data = await res.json();
  if (data.debug) {
    console.group("LLM Debug Info (Idiom)");
    console.log("Prompt:", data.debug.prompt);
    console.log("Raw Response:", data.debug.rawResponse);
    console.groupEnd();
  }
  return data;
}

/**
 * Mock 版本，供後端未啟動或離線時使用。
 */
export async function fetchIdiomExplainMock(
  req: IdiomExplainRequest
): Promise<IdiomExplain> {
  // 模擬非同步呼叫
  await new Promise((resolve) => setTimeout(resolve, 600));

  // 因為是 Mock 範例資料，內容固定為「畫蛇添足」，所以標題也必須固定，避免使用者輸入 A 卻顯示 B 的解釋
  const baseIdiom = "畫蛇添足";
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

  if (level === "junior-high") {
    return {
      idiom: baseIdiom,
      zhuyin: "ㄏㄨㄚˋ ㄕㄜˊ ㄊㄧㄢ ㄗㄨˊ",
      level,
      meaning:
        "語出《戰國策·齊策二》。楚國有個人賜給門客一壺酒，門客們覺得酒少人多，便約定比賽畫蛇，先畫好的人喝酒。一人先畫好後，覺得時間還早，便給蛇添上了腳，結果另一人畫好了蛇，奪過酒說：「蛇本無腳，你怎能給它添腳呢？」於是喝了酒。後比喻做了多餘的事，反而有害無益，徒勞無功。",
      usage:
        "此成語多用於貶義，形容多此一舉，不但無益，反而壞事。常與「弄巧成拙」連用或互相呼應。在寫作或辦事時，若已達完美境界，切忌再做無謂的修飾或補充，以免落入畫蛇添足的窘境。",
      examples: [
        {
          zh: "這項計畫已經非常周詳，若再增加繁瑣的程序，恐怕是畫蛇添足，反而降低效率。"
        },
        {
          zh: "原本簡潔有力的論述，被他加了一段冗長的解釋後，反倒成了畫蛇添足，模糊了焦點。"
        }
      ],
      tips:
        "典故中的「蛇本無足」是關鍵。理解成語典故有助於更精準地掌握其用法。反義詞包括「恰到好處」、「畫龍點睛」。"
    };
  }

  if (level === "university") {
     return {
      idiom: baseIdiom,
      zhuyin: "ㄏㄨㄚˋ ㄕㄜˊ ㄊㄧㄢ ㄗㄨˊ",
      level,
      meaning:
        "源於《戰國策·齊策二》。典故描述楚國門客比畫蛇奪酒，先畫成者復添其足，反失其酒。此語喻指在事物已臻完備之際，復做無益之舉，不僅徒勞無功，反損其原有之美。在現代管理學或決策理論中，亦可用於警示過度優化（Over-engineering）或無效冗餘（Redundancy）的現象。",
      usage:
        "多含貶義，指涉非必要的增補行為。在文學創作、藝術設計或專案執行中，強調簡潔（Simplicity）與恰如其分的重要性。與「弄巧成拙」相近，但側重於「多餘」之意；與「錦上添花」相反，後者指「多餘」但具正面效益。",
      examples: [
        {
          zh: "該政策在執行層面已相當完善，若再疊床架屋地增設監管機構，無異於畫蛇添足，徒增行政成本。"
        },
        {
          zh: "此論證邏輯嚴密，無需再引用旁證，否則畫蛇添足，反倒削弱了核心論點的說服力。"
        }
      ],
      tips:
        "深入探討：試分析「畫蛇添足」與「邊際效益遞減法則（Law of Diminishing Marginal Utility）」之間的關聯性。何時「多」即是「少」？"
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

