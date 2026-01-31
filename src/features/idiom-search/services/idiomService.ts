import { IdiomExplain, IdiomExplainRequest } from "../types";

/**
 * 專門負責與後端 / LLM 溝通的抽象層。
 *
 * 目前實作為前端 mock，方便先開發介面與互動。
 * 未來要接 LLM 時，只要：
 * 1. 保留這個函式簽章不變
 * 2. 在函式內改成呼叫你的後端 API 即可
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
 * 未來要接後端 API / LLM 時，可以改為類似：
 *
 * export async function fetchIdiomExplain(req: IdiomExplainRequest): Promise<IdiomExplain> {
 *   const res = await fetch('/api/idiom/explain', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(req),
 *   });
 *   if (!res.ok) throw new Error('API error');
 *   return res.json();
 * }
 */

