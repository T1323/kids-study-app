# 兒童學習小幫手 (Kids Study App)

給 6 歲與 11 歲孩子使用的綜合學習工具，包含成語查詢與英文學習功能。  
由後端 LLM 生成解釋、用法、例句與注音。支援 Vercel Serverless 部署，並可透過 Google Drive 同步學習記錄。

## 專案特色

*   **多功能整合**：包含成語查詢、英文單字學習與測驗功能。
*   **前後端分離但整合**：使用 React (Vite) 前端 + Express 後端，並透過 `api/` 目錄整合為 Serverless 架構，適合部署於 Vercel。
*   **隱私安全**：後端 **不儲存任何 API Key**，Key 由前端使用者輸入並隨請求發送，保障使用者隱私。
*   **本地記憶 Key**：前端提供「在本地記住 Key」功能，將 Key 儲存於瀏覽器 Local Storage，方便重複使用。
*   **雲端同步**：支援 Google Drive 登入，可備份與同步學習記錄（我的最愛、查詢歷史等）。
*   **Mock 降級機制**：若未輸入 Key 或 Key 無效，系統會自動降級顯示 Mock 範例資料，引導使用者。

## 功能介紹

### 1. 成語小小學堂
*   **成語查詢**：輸入成語或關鍵字，自動補全並查詢解釋。
*   **智慧判斷**：
    *   **成語修正**：自動補全輸入不完整的成語（例如輸入「畫蛇」會顯示「畫蛇添足」）。
    *   **非成語識別**：若輸入俗諺或流行語，會顯示解釋但標示為「非標準成語」。
*   **學習記錄**：自動記錄查詢過的成語，方便複習。

### 2. 英文學習助手
*   **單字查詢**：查詢英文單字，提供中文解釋、詞性、例句。
*   **自訂挑戰**：
    *   可將查詢過的單字加入「自訂挑戰」。
    *   系統根據選擇的單字生成填空測驗，加強記憶。

### 3. 隨機測驗
*   針對成語或英文單字進行隨機測驗，檢測學習成果。

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
4. **重要**：若您希望提供預設的後端 Key (讓使用者免輸入)，可在 Vercel 的 Environment Variables 設定 `LLM_API_KEY`。
5. 部署完成！

## 架構說明

- **前端** (`src/`)：
  - `pages/Dashboard.tsx`：主控台，功能入口。
  - `features/idiom-search/`：成語查詢相關組件與邏輯。
  - `features/english/`：英文學習相關組件與邏輯。
  - `features/quiz/`：測驗功能相關組件。
  - `features/sync/`：Google Drive 同步功能。
  - `context/GlobalContext.tsx`：全域狀態管理（API Key, Theme 等）。

- **後端** (`server/` & `api/`)：
  - `api/index.js`：Vercel Serverless 入口。
  - `server/services/llmService.js`：統一處理 LLM 呼叫與 Prompt 管理。
  - `server/routes/`：API 路由 (idiom, english, quiz)。

## API 規格範例

**POST /api/idiom/explain**

- **Request Body**:
  ```json
  {
    "idiom": "查詢字串",
    "level": "junior" | "senior",
    "apiKey": "使用者提供的 Key"
  }
  ```

**POST /api/english/explain**

- **Request Body**:
  ```json
  {
    "word": "apple",
    "apiKey": "..."
  }
  ```
