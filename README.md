# 成語小小學堂（kids-study-app）

給 6 歲與 11 歲孩子使用的成語查詢網頁工具。  
實作「成語查詢」，由後端 LLM 生成解釋、用法、例句與注音。支援 Vercel Serverless 部署。

## 專案特色

*   **前後端分離但整合**：使用 React (Vite) 前端 + Express 後端，並透過 `api/` 目錄整合為 Serverless 架構，適合部署於 Vercel。
*   **隱私安全**：後端 **不儲存任何 API Key**，Key 由前端使用者輸入並隨請求發送，保障使用者隱私。
*   **本地記憶 Key**：前端提供「在本地記住 Key」功能，將 Key 儲存於瀏覽器 Local Storage，方便重複使用。
*   **智慧判斷**：
    *   **成語修正**：自動補全輸入不完整的成語（例如輸入「畫蛇」會顯示「畫蛇添足」）。
    *   **非成語識別**：若輸入俗諺或流行語（如「早安」），會顯示解釋但標示為「非標準成語」。
    *   **無效輸入**：若輸入亂碼，會顯示錯誤訊息。
*   **Mock 降級機制**：若未輸入 Key 或 Key 無效，系統會自動降級顯示 Mock 範例資料，引導使用者。

## 快速開始

### 1. 安裝依賴

專案已合併依賴，僅需在根目錄執行：

```bash
npm install
```

### 2. 環境變數設定

複製範例檔並建立 `.env`：

```bash
cp server/.env.example .env
```

編輯 `.env` (主要設定 Base URL 與 Model，**API Key 留空即可**，由前端輸入)：

```env
# LLM 服務設定 (例如 Google Gemini)
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
LLM_MODEL=gemini-2.0-flash

# API Key 不需在此設定，由前端傳入
# LLM_API_KEY=
```

### 3. 本地開發

同時啟動前端與後端：

1. **啟動後端** (監聽 Port 3000)：
   ```bash
   npm run server
   ```

2. **啟動前端** (監聽 Port 5173)：
   開啟新的終端機視窗：
   ```bash
   npm run dev
   ```

瀏覽器開啟 `http://localhost:5173` 即可使用。

## 部署至 Vercel

本專案已配置 `vercel.json` 與 `api/index.js`，可直接部署：

1. 將專案 Push 到 GitHub。
2. 在 Vercel Dashboard 匯入專案。
3. Vercel 會自動識別 Vite 框架設定。
4. **重要**：若您希望提供預設的後端 Key (讓使用者免輸入)，可在 Vercel 的 Environment Variables 設定 `LLM_API_KEY` (但需修改後端程式碼以讀取環境變數，目前預設架構為純前端傳入)。
5. 部署完成！

## 架構說明

- **前端** (`src/`)：
  - `IdiomSearchView.tsx`：主介面，處理搜尋邏輯、錯誤處理與 Mock 降級。
  - `ModelSettings.tsx`：API Key 輸入與本地儲存功能。
  - `idiomService.ts`：負責呼叫後端 API。

- **後端** (`server/` & `api/`)：
  - `api/index.js`：Vercel Serverless 入口。
  - `server/services/llmService.js`：處理 Prompt、呼叫 LLM、解析 JSON 結果 (含成語判斷邏輯)。
  - `server/routes/idiom.js`：API 路由處理。

## API 規格

**POST /api/idiom/explain**

- **Request Body**:
  ```json
  {
    "idiom": "查詢字串",
    "level": "junior" | "senior",
    "apiKey": "使用者提供的 Key"
  }
  ```

- **Response**:
  ```json
  {
    "idiom": "完整成語名稱",
    "is_idiom": true, // 是否為標準成語
    "zhuyin": "注音",
    "meaning": "解釋",
    "examples": [...]
  }
  ```
