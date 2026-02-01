import { useState } from "react";
import { IdiomSearchForm } from "./components/IdiomSearchForm";
import { IdiomResultCard } from "./components/IdiomResultCard";
import { ModelSettings, type ModelSettingsValue } from "./components/ModelSettings";
import { IdiomExplain, StudyLevel } from "./types";
import { fetchIdiomExplainOrMock, fetchIdiomExplainMock } from "./services/idiomService";

const defaultModelSettings: ModelSettingsValue = {
  providerId: "google",
  apiKey: "",
  customBaseURL: "",
  customModel: "",
};

export const IdiomSearchView = () => {
  const [level, setLevel] = useState<StudyLevel>("junior");
  const [modelSettings, setModelSettings] = useState<ModelSettingsValue>(defaultModelSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [result, setResult] = useState<IdiomExplain | null>(null);

  const handleSearch = async (idiom: string) => {
    setLoading(true);
    setError(null);
    setWarning(null);
    setResult(null);

    // 1. Check if API Key is empty
    const apiKey = modelSettings.apiKey.trim();
    if (!apiKey) {
      setWarning("請輸入 API Key。以下是查詢範例：");
      // Fallback to Mock
      const mockData = await fetchIdiomExplainMock({ idiom, level });
      setResult(mockData);
      setLoading(false);
      return;
    }

    try {
      const req = {
        idiom,
        level,
        apiKey: apiKey || undefined,
        provider: modelSettings.providerId || undefined,
        model: modelSettings.providerId === "custom" ? modelSettings.customModel.trim() || undefined : undefined,
        baseURL: modelSettings.providerId === "custom" ? modelSettings.customBaseURL.trim() || undefined : undefined,
      };
      const data = await fetchIdiomExplainOrMock(req);
      setResult(data);
    } catch (e: any) {
      console.error(e);
      const msg = e.message || "未知錯誤";

      // 3. Not Found Logic (Business Error)
      if (msg.includes("找不到相近成語")) {
        setError("找不到相近成語，請確認輸入是否正確。");
        // Don't show mock data for "Not Found"
      } else {
        // 2. API Error / Invalid Key (System Error)
        setWarning(`API Key 無效或發生錯誤 (${msg})。以下是查詢範例：`);
        // Fallback to Mock
        const mockData = await fetchIdiomExplainMock({ idiom, level });
        setResult(mockData);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>成語查詢</h2>
          <p className="card-description">
            輸入想查的成語，系統會提供解釋、用法與例句。
          </p>
        </div>
        <div className="level-switch">
          <span className="level-label">學習難度：</span>
          <button
            className={level === "junior" ? "level-btn active" : "level-btn"}
            onClick={() => setLevel("junior")}
          >
            低年級
          </button>
          <button
            className={level === "senior" ? "level-btn active" : "level-btn"}
            onClick={() => setLevel("senior")}
          >
            高年級
          </button>
        </div>
      </header>

      <div className="model-settings-wrap">
        <ModelSettings
          value={modelSettings}
          onChange={setModelSettings}
          disabled={loading}
        />
      </div>

      <IdiomSearchForm onSearch={handleSearch} loading={loading} />

      {error && <div className="error-banner">{error}</div>}
      {warning && (
        <div
          className="warning-banner"
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            borderRadius: "8px",
            backgroundColor: "#fff3cd",
            color: "#856404",
            border: "1px solid #ffeeba",
          }}
        >
          {warning}
        </div>
      )}

      {result && !error && (
        <div className="results-section">
          <IdiomResultCard result={result} />
        </div>
      )}
    </section>
  );
};

