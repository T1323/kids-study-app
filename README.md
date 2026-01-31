# 成語 & 英文小小學堂（kids-study-app）

一個給 6 歲與 11 歲孩子使用的成語 / 英文學習網頁工具。  
目前先實作「成語查詢」，之後可以擴充「測驗」「學習路徑」等功能。

## 架構設計概念

- **前端 UI（這個專案）**
  - 使用 React + TypeScript + Vite，保持簡潔好維護。
  - `App` → `IdiomSearchView`（成語查詢主畫面）。
  - `features/idiom-search` 底下拆成：
    - `IdiomSearchView.tsx`：畫面組合、狀態管理（loading / error / result）。
    - `components/IdiomSearchForm.tsx`：輸入表單（成語輸入 + 查詢按鈕）。
    - `components/IdiomResultCard.tsx`：結果呈現卡片。
    - `types.ts`：查詢與回傳資料的型別定義。
    - `services/idiomService.ts`：與後端 / LLM 溝通的抽象層（目前是 mock）。

- **服務層抽象（`idiomService`）**
  - 目前提供 `fetchIdiomExplainMock(req)`，方便先開發 UI。
  - 未來改成 `fetchIdiomExplain(req)` 呼叫你的後端 API 即可，不需要動 UI。

- **未來後端 / LLM 建議（尚未實作）**
  - REST API 例：`POST /api/idiom/explain`
    - Request：`{ idiom, level: "junior" | "senior", language: "zh-Hant" }`
    - Response：與 `IdiomExplain` 型別相同。
  - 後端負責：
    - 組 LLM prompt（依據 `level` 調整用字難度）。
    - 呼叫實際 LLM（例如 OpenAI、DeepSeek、Azure OpenAI 等）。
    - 做基本的內容過濾與快取（避免重複消耗 token）。

## 開發指令

```bash
npm install
npm run dev
```

瀏覽器開啟 `http://localhost:5173`。

## 之後要接 LLM 時要改的地方

1. 新增一個後端（可用 Node.js / Next.js / 任意框架）提供例如 `POST /api/idiom/explain`。
2. 在 `src/features/idiom-search/services/idiomService.ts`：
   - 把現在的 `fetchIdiomExplainMock` 改成呼叫你的後端 API。
   - 保持 `IdiomExplainRequest` / `IdiomExplain` 型別不變，前端畫面就不用重寫。

這樣可以把「畫面呈現」和「LLM 邏輯」清楚分離，之後要換模型、調整 prompt 或加上成語資料庫，都集中在後端與 service 層處理即可。

