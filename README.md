# 成語小小學堂（kids-study-app）

給 6 歲與 11 歲孩子使用的成語查詢網頁工具。  
目前實作「成語查詢」（由後端 LLM 生成解釋、用法、例句與注音），之後可擴充「測驗」等功能。

## 介面上的模型與 API Key

- **模型 / 服務**：可在介面下拉選單選擇預設的免費或付費服務（Google Gemini、Groq、DeepSeek、OpenAI、自訂）。
- **API Key**：選填。有填時會與所選服務一併送給後端，僅用於該次請求，後端不儲存。
- **自動判斷**：貼上或輸入 API Key 後（失焦或貼上時），會依 Key 前綴自動推測服務並更新選單（例如 `AIza` → Google、`gsk_` → Groq、`sk-` → OpenAI）。
- **自訂**：選「自訂」時可輸入 API 網址與模型名稱，適合其他 OpenAI 相容服務。

## 推薦的免費模型 / 服務

以下為預設選單中的選項，多數提供免費額度，需自行至官網取得 API Key：

| 服務 | 說明 | 取得 Key |
|------|------|----------|
| **Google Gemini（免費額度）** | 每日約 1,500 次、多模型，適合一般使用 | [Google AI Studio](https://aistudio.google.com/apikey) |
| **Groq（免費額度）** | 回應快、每日約 14,400 次，Llama 等模型 | [Groq Console](https://console.groq.com/keys) |
| **DeepSeek（免費額度）** | 每日約 50 萬 token，成本低 | [DeepSeek Platform](https://platform.deepseek.com/api_keys) |
| **OpenAI** | 需付費，無免費 API 額度 | [OpenAI API Keys](https://platform.openai.com/api-keys) |

未填 API Key 時，後端會使用 `server/.env` 的 `OPENAI_API_KEY`（若有的話）；前端設 `VITE_USE_MOCK=true` 則完全不呼叫後端，改為 mock 資料。

## 架構概覽

- **前端**（Vite + React + TypeScript）
  - `src/features/idiom-search`：成語查詢、**模型選擇與 API Key 輸入**、表單。
  - `idiomService.ts`：呼叫 `GET /api/providers`、`GET /api/providers/detect`、`POST /api/idiom/explain`；可設 `VITE_USE_MOCK=true` 改回 mock。

- **後端**（Node.js + Express，`server/`）
  - `GET /api/providers`：回傳可選的模型清單（id、name、取得 Key 連結）。
  - `GET /api/providers/detect?key=xxx`：依 Key 前綴推測 provider。
  - `POST /api/idiom/explain`：接收 `{ idiom, level, apiKey?, provider?, model?, baseURL? }`，由 LLM 生成成語說明。
  - `server/config/providers.js`：預設服務的 baseURL、model、取得 Key 連結。
  - `server/services/llmService.js`：依請求的 apiKey/provider 建立客戶端並呼叫 OpenAI 相容 API。

## 如何進行：後端 LLM Service

### 1. 安裝後端依賴

```bash
cd server
npm install
```

### 2. 設定環境變數

在 `server/` 目錄複製範例並填入你的 API Key：

```bash
cp .env.example .env
```

編輯 `server/.env`：

- **OPENAI_API_KEY**：必填，你的 OpenAI（或相容服務）API Key。
- **OPENAI_BASE_URL**：選填。若用 DeepSeek 等，可設為 `https://api.deepseek.com`。
- **OPENAI_MODEL**：選填，預設 `gpt-4o-mini`。可改為 `gpt-4o`、`deepseek-chat` 等。
- **PORT**：選填，預設 `3000`。

### 3. 啟動後端

```bash
cd server
npm run dev
```

會看到「後端已啟動：http://localhost:3000」。

### 4. 啟動前端並呼叫後端

在專案根目錄：

```bash
npm install
npm run dev
```

瀏覽器開啟 `http://localhost:5173`，輸入成語查詢即會呼叫後端，由 LLM 生成說明。

- 若暫時不想用後端（或後端未啟動），可在專案根目錄建立 `.env` 並設 `VITE_USE_MOCK=true`，前端會改回 mock 資料。
- 若後端跑在不同網址或 port，可設 `VITE_API_BASE_URL=http://你的後端網址`（例如 `http://localhost:3000`）。

## 開發指令整理

| 用途       | 指令 |
|------------|------|
| 只跑前端（mock） | 根目錄 `npm run dev`，並設 `VITE_USE_MOCK=true` |
| 跑前端 + 後端（LLM） | 先 `cd server && npm run dev`，再在根目錄 `npm run dev` |
| 後端正式執行 | `cd server && npm start` |

## 後端 API 規格

- **GET /api/providers**  
  Response：`[{ id, name, getKeyUrl }]`，供前端下拉選單與「取得 API Key」連結。

- **GET /api/providers/detect?key=xxx**  
  Response：`{ provider: "google" | "groq" | "openai" | null }`，依 Key 前綴推測。

- **POST /api/idiom/explain**
  - Request body：`{ idiom: string, level: "junior" | "senior", apiKey?: string, provider?: string, model?: string, baseURL?: string }`
  - 若有 `apiKey`，會與 `provider`（或自動偵測）一併使用；`provider === "custom"` 時需傳 `model`、`baseURL`。
  - Response：與前端 `IdiomExplain` 型別相同。

之後要新增預設服務或調整 prompt，可改 `server/config/providers.js` 與 `server/services/llmService.js`。
