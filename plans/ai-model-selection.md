# AI Model Selection Feature Implementation Plan

## Overview
Currently, the `ModelSettings.tsx` component allows users to input an API key and optionally enter a custom model name. The user wants to improve this by fetching a list of available models using the provided API key, filtering out non-text models, and displaying them in a dropdown for the user to select. Invalid API keys should result in an error message.

## Steps to Implement

### 1. Backend: API Endpoint for Fetching Models
We need a new endpoint `POST /api/models/fetch` that takes the `apiKey`, `providerId`, and optionally `customBaseURL`. It will use the OpenAI SDK (which our backend already uses for various providers like Groq, DeepSeek, Google, OpenAI) to list available models.

**File:** `server/routes/idiom.js` (or a new `models.js` route file, but `idiom.js` already handles `providers` related things. Let's create `server/routes/models.js` and register it in `server/index.js`).
```javascript
// server/routes/models.js
import OpenAI from "openai";
import { PROVIDERS, detectProviderFromApiKey } from "../config/providers.js";

export async function postFetchModels(req, res) {
  try {
    const { apiKey, providerId, customBaseURL } = req.body || {};
    const trimmedKey = typeof apiKey === "string" ? apiKey.trim() : "";
    
    if (!trimmedKey) {
      return res.status(400).json({ error: "請提供 API Key。" });
    }

    let pId = providerId || detectProviderFromApiKey(trimmedKey);
    const provider = pId && PROVIDERS[pId];
    const baseURL = customBaseURL || (provider?.baseURL ?? "");

    const client = new OpenAI({
      apiKey: trimmedKey,
      baseURL: baseURL ? (baseURL.endsWith("/") ? baseURL : baseURL + "/") : undefined,
    });

    const response = await client.models.list();
    const models = response.data;
    
    // Filtering logic (Step 2)
    const validModels = models.filter(m => {
      const id = m.id.toLowerCase();
      // Exclude obvious non-text models
      if (id.includes("whisper") || id.includes("tts") || id.includes("dall-e") || id.includes("embedding") || id.includes("babbage") || id.includes("davinci") || id.includes("vision")) {
          // Note: some vision models also support text, but let's keep it simple or allow standard models.
          // Google's models: gemini-*, exclude embedding-*
          if (id.includes("embedding")) return false;
          return false;
      }
      return true;
    }).map(m => m.id);

    res.json({ models: validModels.sort() });
  } catch (err) {
    console.error("[POST /api/models/fetch]", err);
    res.status(401).json({ error: "API Key 無效或無法取得模型清單。" });
  }
}
```

### 2. Update `server/index.js`
Import and register the new route:
```javascript
import { postFetchModels } from "./routes/models.js";
// ...
app.post("/api/models/fetch", postFetchModels);
```

### 3. Frontend: API Service
**File:** `src/features/idiom-search/services/idiomService.ts`
Add a new function:
```typescript
export async function fetchAvailableModels(apiKey: string, providerId: string, customBaseURL?: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/models/fetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, providerId, customBaseURL }),
  });
  
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "無法取得模型清單，請檢查 API Key 是否有效。");
  }
  
  const data = await res.json();
  return data.models || [];
}
```

### 4. Frontend: `ModelSettings.tsx`
Update the UI to:
1.  Keep the Provider dropdown.
2.  Keep the API Key input.
3.  Add a "驗證並載入模型" (Validate and Load Models) button next to the API Key input (or automatically trigger it when the user clicks it or blurs, but a button is more explicit and safer to avoid spamming the API).
4.  If models are successfully fetched, display a dropdown for "選擇模型" (Select Model). This dropdown replaces or enhances the `customModel` input. If the user selects a standard provider, we can still let them choose from the fetched list instead of using the hardcoded default. We should store this in the `customModel` field or add a `selectedModel` field. The current interface uses `customModel` for overrides. We can map the selected dropdown value to `customModel`.
5.  Show error messages gracefully if the fetch fails.

Modifications to `ModelSettings.tsx`:
*   State variables: `availableModels` (string array), `isLoadingModels` (boolean), `errorMsg` (string).
*   Add a function `handleFetchModels` that calls `fetchAvailableModels` and updates state.
*   Update the rendering:
    *   Show error message in red if `errorMsg` exists.
    *   If `availableModels` has items, render a `<select>` to choose the model. The selected value updates `value.customModel`. If they want to type manually, maybe add an "Other..." option.

```tsx
// Inside ModelSettings.tsx
const [availableModels, setAvailableModels] = useState<string[]>([]);
const [isLoadingModels, setIsLoadingModels] = useState(false);
const [errorMsg, setErrorMsg] = useState("");

const handleFetchModels = async () => {
    const key = value.apiKey.trim();
    if (!key) {
        setErrorMsg("請先輸入 API Key");
        return;
    }
    setIsLoadingModels(true);
    setErrorMsg("");
    try {
        const models = await fetchAvailableModels(key, value.providerId, value.customBaseURL);
        setAvailableModels(models);
        if (models.length > 0 && !models.includes(value.customModel)) {
             // Automatically select the first available model if current is empty or not in list
             if (!value.customModel) {
                 onChange({ ...value, customModel: models[0] });
             }
        }
        alert("驗證成功！已載入可用模型。");
    } catch (err: any) {
        setErrorMsg(err.message || "驗證失敗");
        setAvailableModels([]);
    } finally {
        setIsLoadingModels(false);
    }
};

// ... in return statement
<div className="model-settings-row">
    <button onClick={handleFetchModels} disabled={isLoadingModels}>
        {isLoadingModels ? "載入中..." : "驗證 API Key 並載入模型"}
    </button>
</div>
{errorMsg && <div style={{ color: "red", fontSize: "0.9em" }}>{errorMsg}</div>}

{availableModels.length > 0 && (
    <div className="model-settings-row">
        <label>選擇可用模型</label>
        <select 
            value={value.customModel} 
            onChange={(e) => onChange({...value, customModel: e.target.value})}
            className="model-settings-select"
        >
            <option value="">-- 使用服務預設模型 --</option>
            {availableModels.map(m => (
                <option key={m} value={m}>{m}</option>
            ))}
        </select>
    </div>
)}
```

This plan covers backend creation, backend integration, frontend service addition, and UI modifications.
