import { useState } from "react";
import { IdiomSearchForm } from "./components/IdiomSearchForm";
import { IdiomResultCard } from "./components/IdiomResultCard";
import { ModelSettings, type ModelSettingsValue } from "./components/ModelSettings";
import { IdiomExplain, StudyLevel } from "./types";
import { fetchIdiomExplainOrMock } from "./services/idiomService";

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
  const [result, setResult] = useState<IdiomExplain | null>(null);

  const handleSearch = async (idiom: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const req = {
        idiom,
        level,
        apiKey: modelSettings.apiKey.trim() || undefined,
        provider: modelSettings.providerId || undefined,
        model: modelSettings.providerId === "custom" ? modelSettings.customModel.trim() || undefined : undefined,
        baseURL: modelSettings.providerId === "custom" ? modelSettings.customBaseURL.trim() || undefined : undefined,
      };
      const data = await fetchIdiomExplainOrMock(req);
      setResult(data);
    } catch (e) {
      console.error(e);
      setError("查詢時發生錯誤，請稍後再試。");
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

      {result && !error && (
        <div className="results-section">
          <IdiomResultCard result={result} />
        </div>
      )}
    </section>
  );
};

